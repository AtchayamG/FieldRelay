import { CallValidationError } from './errors';

export interface CallCursor {
  createdAt: Date;
  id: string;
}

export function encodeCallCursor(cursor: CallCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString(
    'base64url'
  );
}

export function decodeCallCursor(raw: string): CallCursor {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8');
  const separator = decoded.indexOf('|');
  const createdAt = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (separator === -1 || Number.isNaN(createdAt.getTime()) || id.length === 0) {
    throw new CallValidationError('cursor is not a valid pagination cursor');
  }
  return { createdAt, id };
}
