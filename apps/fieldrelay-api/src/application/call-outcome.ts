export interface CallOutcome {
  callTaskId: string;
  // The schema-validated answer, keyed exactly as the declared result schema.
  structuredResult: Record<string, unknown>;
  taskCompleted: boolean;
  confidenceScore: number | null;
  confidenceLabel: string | null;
  // True when the provider's answer did not satisfy the declared schema. The
  // outcome is still recorded: "the call happened but the answer was unusable"
  // is a fact an operator must see, not something to silently drop.
  validationFailed: boolean;
  receivedAt: Date;
}

export const CALL_OUTCOME_REPOSITORY = Symbol('CALL_OUTCOME_REPOSITORY');

export interface CallOutcomeRepositoryPort {
  // One outcome per call task. A redelivered terminal webhook must overwrite
  // rather than append a second opinion.
  upsert(outcome: CallOutcome): Promise<void>;
  findByCallTaskId(callTaskId: string): Promise<CallOutcome | null>;
}

const MAX_STRING_LENGTH = 400;
const MAX_PROPERTIES = 12;

export interface ValidatedOutcome {
  structuredResult: Record<string, unknown>;
  validationFailed: boolean;
}

// Validates the provider's answer against the result schema FieldRelay itself
// declared when creating the call.
//
// This is a trust boundary, not a formality. The answer is produced by a
// language model transcribing a stranger on a telephone, and it goes on to
// drive an approval decision about money. So: unknown keys are dropped rather
// than stored, enum fields must hold a declared value, and anything unexpected
// marks the outcome as failed validation instead of being coerced into looking
// valid.
export function validateStructuredResult(
  raw: unknown,
  resultSchema: Record<string, unknown>
): ValidatedOutcome {
  if (!isRecord(raw)) {
    return { structuredResult: {}, validationFailed: true };
  }

  const properties = isRecord(resultSchema.properties) ? resultSchema.properties : {};
  const required = Array.isArray(resultSchema.required)
    ? resultSchema.required.filter((key): key is string => typeof key === 'string')
    : [];

  const accepted: Record<string, unknown> = {};
  let failed = false;

  for (const [key, value] of Object.entries(raw)) {
    const definition = properties[key];
    if (!isRecord(definition)) {
      // Not declared in the schema. Dropped rather than persisted: the caller
      // asked a bounded question and must not receive an unbounded answer.
      failed = true;
      continue;
    }
    if (Object.keys(accepted).length >= MAX_PROPERTIES) {
      failed = true;
      break;
    }

    const check = coerce(value, definition);
    if (check === undefined) {
      failed = true;
      continue;
    }
    accepted[key] = check;
  }

  // A missing required field means the question was not actually answered.
  for (const key of required) {
    if (!(key in accepted)) {
      failed = true;
    }
  }

  return { structuredResult: accepted, validationFailed: failed };
}

// Returns the accepted value, or undefined when it violates the declaration.
function coerce(value: unknown, definition: Record<string, unknown>): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  const declaredEnum = definition.enum;
  if (Array.isArray(declaredEnum)) {
    return declaredEnum.includes(value) ? value : undefined;
  }

  switch (definition.type) {
    case 'string':
      return typeof value === 'string' && value.length <= MAX_STRING_LENGTH ? value : undefined;
    case 'integer':
      return Number.isInteger(value) && withinBounds(value as number, definition)
        ? value
        : undefined;
    case 'number':
      return typeof value === 'number' &&
        Number.isFinite(value) &&
        withinBounds(value, definition)
        ? value
        : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    default:
      return undefined;
  }
}

// `minimum` and `maximum` are enforced here but deliberately stripped before
// the schema is sent to CALL-E, whose documented feature list does not include
// them. FieldRelay's acceptance contract is allowed to be stricter than what
// the provider was asked for: a technician arriving in -5 minutes is not an
// answer, whatever the model returned.
function withinBounds(value: number, definition: Record<string, unknown>): boolean {
  if (typeof definition.minimum === 'number' && value < definition.minimum) {
    return false;
  }
  if (typeof definition.maximum === 'number' && value > definition.maximum) {
    return false;
  }
  return true;
}

// The subset of JSON Schema that CALL-E documents support for. Anything else —
// including the bounds above — is removed before transmission so a call is
// never rejected over a keyword the provider does not recognise.
const PROVIDER_SUPPORTED_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'enum',
  'items',
  'description',
  'additionalProperties'
]);

export function toProviderSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!PROVIDER_SUPPORTED_KEYWORDS.has(key)) {
      continue;
    }
    if (key === 'properties' && isRecord(value)) {
      const properties: Record<string, unknown> = {};
      for (const [name, definition] of Object.entries(value)) {
        properties[name] = isRecord(definition) ? toProviderSchema(definition) : definition;
      }
      output.properties = properties;
      continue;
    }
    if (key === 'items' && isRecord(value)) {
      output.items = toProviderSchema(value);
      continue;
    }
    output[key] = value;
  }
  return output;
}

// Bounded to 0..1. A provider that reports something else is not trusted to
// have reported anything.
export function readConfidence(raw: unknown): {
  score: number | null;
  label: string | null;
} {
  if (!isRecord(raw)) {
    return { score: null, label: null };
  }
  const score =
    typeof raw.score === 'number' && Number.isFinite(raw.score) && raw.score >= 0 && raw.score <= 1
      ? Math.round(raw.score * 1000) / 1000
      : null;
  const label =
    typeof raw.label === 'string' && raw.label.length > 0 && raw.label.length <= 32
      ? raw.label
      : null;
  return { score, label };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
