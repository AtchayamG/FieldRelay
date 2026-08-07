import {
  readConfidence,
  toProviderSchema,
  validateStructuredResult
} from '../application/call-outcome';
import { briefForPurpose } from '../application/call-brief';

const SCHEMA = briefForPurpose('vendor_availability', 'CALL-1').resultSchema;

describe('validateStructuredResult', () => {
  it('accepts an answer that matches the declared schema', () => {
    const result = validateStructuredResult(
      { available: 'yes', earliest_eta_minutes: 45, quoted_amount_text: '$360' },
      SCHEMA
    );

    expect(result).toEqual({
      structuredResult: {
        available: 'yes',
        earliest_eta_minutes: 45,
        quoted_amount_text: '$360'
      },
      validationFailed: false
    });
  });

  it('accepts an answer carrying only the required field', () => {
    expect(validateStructuredResult({ available: 'unknown' }, SCHEMA)).toEqual({
      structuredResult: { available: 'unknown' },
      validationFailed: false
    });
  });

  it('drops undeclared keys instead of storing them', () => {
    // The caller asked a bounded question and must not receive an unbounded
    // answer. A model that volunteers extra fields does not get to widen the
    // contract.
    const result = validateStructuredResult(
      { available: 'yes', tenant_phone_number: '+919999900000', notes: 'call back later' },
      SCHEMA
    );

    expect(result.structuredResult).toEqual({ available: 'yes' });
    expect(result.validationFailed).toBe(true);
    expect(JSON.stringify(result)).not.toContain('919999900000');
  });

  it('rejects a value outside a declared enum', () => {
    // "maybe" is not one of yes/no/unknown. Coercing it to a decision would be
    // worse than admitting the answer was unusable.
    const result = validateStructuredResult({ available: 'maybe' }, SCHEMA);

    expect(result.structuredResult).toEqual({});
    expect(result.validationFailed).toBe(true);
  });

  it('rejects a value of the wrong type', () => {
    const result = validateStructuredResult(
      { available: 'yes', earliest_eta_minutes: 'about an hour' },
      SCHEMA
    );

    expect(result.structuredResult).toEqual({ available: 'yes' });
    expect(result.validationFailed).toBe(true);
  });

  it('flags a missing required field', () => {
    const result = validateStructuredResult({ quoted_amount_text: '$360' }, SCHEMA);

    expect(result.validationFailed).toBe(true);
    expect(result.structuredResult).not.toHaveProperty('available');
  });

  it('rejects an oversized string rather than truncating it', () => {
    const result = validateStructuredResult(
      { available: 'yes', quoted_amount_text: 'x'.repeat(5000) },
      SCHEMA
    );

    expect(result.structuredResult).toEqual({ available: 'yes' });
    expect(result.validationFailed).toBe(true);
  });

  it.each([
    ['a string', 'available: yes'],
    ['an array', [{ available: 'yes' }]],
    ['null', null],
    ['a number', 42]
  ])('treats %s as an unusable answer', (_label, raw) => {
    expect(validateStructuredResult(raw, SCHEMA)).toEqual({
      structuredResult: {},
      validationFailed: true
    });
  });

  it('records the failure without losing the fields that were valid', () => {
    // An operator can still act on a partial answer; they just need to know it
    // was partial.
    const result = validateStructuredResult(
      { available: 'no', earliest_eta_minutes: -5 },
      SCHEMA
    );

    expect(result.structuredResult).toEqual({ available: 'no' });
    expect(result.validationFailed).toBe(true);
  });
});

describe('toProviderSchema', () => {
  it('removes bounds CALL-E does not document support for', () => {
    const sent = toProviderSchema(SCHEMA) as {
      properties: Record<string, Record<string, unknown>>;
    };

    expect(sent.properties.earliest_eta_minutes).not.toHaveProperty('minimum');
    expect(sent.properties.earliest_eta_minutes).not.toHaveProperty('maximum');
    // Sending an unrecognised keyword risks the whole call being rejected, so
    // the stricter rules stay on FieldRelay's side of the boundary.
    expect(JSON.stringify(sent)).not.toContain('minimum');
  });

  it('keeps every keyword the provider does document', () => {
    const sent = toProviderSchema(SCHEMA) as Record<string, unknown> & {
      properties: Record<string, Record<string, unknown>>;
    };

    expect(sent.type).toBe('object');
    expect(sent.required).toEqual(['available']);
    expect(sent.additionalProperties).toBe(false);
    expect(sent.properties.available.enum).toEqual(['yes', 'no', 'unknown']);
    expect(sent.properties.available.description).toBeDefined();
  });

  it('leaves the local schema untouched so validation still enforces bounds', () => {
    toProviderSchema(SCHEMA);
    const properties = SCHEMA.properties as Record<string, Record<string, unknown>>;
    expect(properties.earliest_eta_minutes.minimum).toBe(0);
  });
});

describe('readConfidence', () => {
  it('reads a bounded score and label', () => {
    expect(readConfidence({ score: 0.82, label: 'high' })).toEqual({
      score: 0.82,
      label: 'high'
    });
  });

  it('rounds to three decimal places to match the stored column', () => {
    expect(readConfidence({ score: 0.826543, label: 'high' }).score).toBe(0.827);
  });

  it.each([
    ['out of range high', { score: 1.4 }],
    ['out of range low', { score: -0.2 }],
    ['non-numeric', { score: 'high' }],
    ['absent', {}],
    ['not an object', 'high']
  ])('refuses %s and reports no score', (_label, raw) => {
    expect(readConfidence(raw).score).toBeNull();
  });

  it('refuses an over-long label', () => {
    expect(readConfidence({ label: 'x'.repeat(200) }).label).toBeNull();
  });
});
