import { selectCallEAdapter } from '../app.module';
import { briefForPurpose } from '../application/call-brief';
import { CallbackAuthenticationError, CallProviderConfigurationError } from '../application/errors';
import { CalleWebhookTranslator } from '../infrastructure/call-e/calle-webhook.translator';
import { parseDialTargets } from '../infrastructure/contact/env-dial-target.resolver';

const TOKEN = 'a-sufficiently-long-webhook-token-value';

describe('CalleWebhookTranslator authentication', () => {
  it('accepts the configured token', () => {
    const translator = new CalleWebhookTranslator(TOKEN);
    expect(() => translator.authenticate(TOKEN)).not.toThrow();
  });

  it('rejects a wrong token', () => {
    const translator = new CalleWebhookTranslator(TOKEN);
    expect(() => translator.authenticate('wrong-but-equally-long-token-value!!')).toThrow(
      CallbackAuthenticationError
    );
  });

  it('rejects a missing token', () => {
    const translator = new CalleWebhookTranslator(TOKEN);
    expect(() => translator.authenticate(undefined)).toThrow(CallbackAuthenticationError);
  });

  it('fails closed when the server has no token or a weak one', () => {
    expect(() => new CalleWebhookTranslator(undefined).authenticate(TOKEN)).toThrow(
      CallbackAuthenticationError
    );
    expect(() => new CalleWebhookTranslator('short').authenticate('short')).toThrow(
      CallbackAuthenticationError
    );
  });
});

describe('CalleWebhookTranslator translation', () => {
  const translator = new CalleWebhookTranslator(TOKEN);

  it('translates a terminal delivery', () => {
    expect(
      translator.translate({ event_id: 'evt_1', call_id: 'call_9', status: 'completed' })
    ).toEqual({ eventId: 'evt_1', providerTaskId: 'call_9', status: 'completed' });
  });

  it('derives a deterministic event ID when the provider supplies none', () => {
    const first = translator.translate({ call_id: 'call_9', status: 'failed' });
    const second = translator.translate({ call_id: 'call_9', state: 'error' });

    expect(first).not.toBeNull();
    // Same call, same resulting transition: the replay must collapse onto one
    // event ID so it is recognised rather than applied twice.
    expect(first?.eventId).toBe(second?.eventId);
    expect(first?.status).toBe('failed');
  });

  it('gives different events different IDs', () => {
    const ringing = translator.translate({ call_id: 'call_9', status: 'ringing' });
    const completed = translator.translate({ call_id: 'call_9', status: 'completed' });
    expect(ringing?.eventId).not.toBe(completed?.eventId);
  });

  it('ignores non-actionable and unrecognised lifecycle states', () => {
    expect(translator.translate({ call_id: 'call_9', status: 'queued' })).toBeNull();
    expect(translator.translate({ call_id: 'call_9', status: 'something_new' })).toBeNull();
  });

  it('ignores a delivery with no call identifier', () => {
    expect(translator.translate({ status: 'completed' })).toBeNull();
    expect(translator.translate('not an object')).toBeNull();
    expect(translator.translate(null)).toBeNull();
  });

  it('discards transcripts, recordings and structured results', () => {
    const translated = translator.translate({
      call_id: 'call_9',
      status: 'completed',
      transcript: 'the vendor said they can come at four',
      recording_url: 'https://example.test/recording.mp3',
      structured_result: { available: 'yes' }
    });

    expect(translated).toEqual({
      eventId: expect.stringMatching(/^calle_[0-9a-f]{40}$/),
      providerTaskId: 'call_9',
      status: 'completed'
    });
  });
});

describe('parseDialTargets', () => {
  it('parses a multi-entry allowlist', () => {
    const targets = parseDialTargets('CNS-4491=+6512345678|SG|en-SG,CNS-7788=+14155550123|US|en-US');
    expect(targets.get('CNS-4491')).toEqual({
      phoneE164: '+6512345678',
      region: 'SG',
      locale: 'en-SG'
    });
    expect(targets.size).toBe(2);
  });

  it('treats an unset or empty allowlist as no callable contacts', () => {
    expect(parseDialTargets(undefined).size).toBe(0);
    expect(parseDialTargets('   ').size).toBe(0);
  });

  it.each([
    ['a non-E.164 number', 'CNS-1=012345678|SG|en-SG'],
    ['a missing region', 'CNS-1=+6512345678||en-SG'],
    ['a malformed locale', 'CNS-1=+6512345678|SG|english'],
    ['a missing contact ID', '=+6512345678|SG|en-SG'],
    ['a duplicate contact', 'CNS-1=+6512345678|SG|en-SG,CNS-1=+6512345679|SG|en-SG']
  ])('refuses %s at boot', (_label, raw) => {
    expect(() => parseDialTargets(raw)).toThrow(CallProviderConfigurationError);
  });
});

describe('selectCallEAdapter', () => {
  it('selects the demo adapter unless the mode is explicitly live', () => {
    expect(selectCallEAdapter({}).describe().simulated).toBe(true);
    expect(selectCallEAdapter({ CALL_E_MODE: '' }).describe().simulated).toBe(true);
    expect(selectCallEAdapter({ CALL_E_MODE: 'demo' }).describe().simulated).toBe(true);
    expect(selectCallEAdapter({ CALL_E_MODE: 'production' }).describe().simulated).toBe(true);
  });

  it('selects the live adapter when the mode and configuration are both present', () => {
    const adapter = selectCallEAdapter({
      CALL_E_MODE: 'live',
      CALLE_BASE_URL: 'https://api.example.test',
      CALLE_API_KEY: 'calle_test_key_0123456789'
    });
    expect(adapter.describe()).toEqual({ mode: 'live', simulated: false });
  });

  it('refuses to boot in live mode without a valid configuration', () => {
    expect(() => selectCallEAdapter({ CALL_E_MODE: 'live' })).toThrow(
      CallProviderConfigurationError
    );
  });
});

describe('briefForPurpose', () => {
  it('builds a closed result schema and references the call by display ID only', () => {
    const brief = briefForPurpose('vendor_availability', 'CALL-1042');
    expect(brief.goal).toContain('CALL-1042');
    expect(brief.disclosure).toContain('automated assistant');
    expect(brief.resultSchema).toMatchObject({ additionalProperties: false });
  });

  it('covers every call purpose', () => {
    for (const purpose of ['vendor_availability', 'appointment_confirmation', 'status_update'] as const) {
      const brief = briefForPurpose(purpose, 'CALL-1');
      expect(brief.resultSchema).toMatchObject({ type: 'object', additionalProperties: false });
      expect(brief.disclosure.length).toBeGreaterThan(0);
    }
  });
});
