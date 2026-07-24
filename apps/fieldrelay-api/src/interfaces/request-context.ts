import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

// One correlation identifier per request, reused by the success envelope, the
// error envelope and every audit event written while handling it.
export function requestIdOf(request: Request): string {
  const existing = (request as Request & { fieldrelayRequestId?: string }).fieldrelayRequestId;
  if (existing) return existing;

  const generated = `req_${randomUUID()}`;
  (request as Request & { fieldrelayRequestId?: string }).fieldrelayRequestId = generated;
  return generated;
}
