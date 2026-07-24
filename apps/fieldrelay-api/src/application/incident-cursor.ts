import { CallValidationError } from './errors';

// Opaque keyset cursor over the (createdAt, id) sort key. Keyset rather than
// offset because the incident list is live: offsets skip or repeat rows as new
// incidents arrive (blueprint doc 07, section 7).
export interface IncidentCursor {
  createdAt: Date;
  id: string;
}

export function encodeIncidentCursor(cursor: IncidentCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString(
    'base64url'
  );
}

export function decodeIncidentCursor(raw: string): IncidentCursor {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8');
  const separator = decoded.indexOf('|');
  if (separator === -1) {
    throw new CallValidationError('cursor is not a valid pagination cursor');
  }
  const createdAt = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) {
    throw new CallValidationError('cursor is not a valid pagination cursor');
  }
  return { createdAt, id };
}
