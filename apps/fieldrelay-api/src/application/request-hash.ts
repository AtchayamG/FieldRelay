import { createHash } from 'node:crypto';
import { CallValidationError } from './errors';

// Idempotency keys are attacker-reachable input, so they are bounded here
// before they ever reach a database index.
export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export function requireIdempotencyKey(value: string | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CallValidationError('Idempotency-Key header is required');
  }
  const key = value.trim();
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new CallValidationError(
      `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`
    );
  }
  // Printable ASCII only: keeps keys log-safe and comparable byte for byte.
  if (!/^[\x21-\x7e]+$/.test(key)) {
    throw new CallValidationError(
      'Idempotency-Key must contain only printable ASCII characters'
    );
  }
  return key;
}

// Hashes the *normalized* request so that two requests which mean the same
// thing (defaults applied, key order differing) produce the same digest, and
// any material difference produces a different one.
export function hashRequest(request: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalize(request)).digest('hex');
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(',')}}`;
}
