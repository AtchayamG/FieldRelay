import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AllowedCallbackStatus } from '@fieldrelay/contracts';
import { CallbackAuthenticationError } from '../../application/errors';
import { asRecord, mapCalleStatus, readBoundedString } from './calle-status';

export const CALLE_WEBHOOK_TRANSLATOR = Symbol('CALLE_WEBHOOK_TRANSLATOR');

// A CALL-E lifecycle event, reduced to the three fields FieldRelay is willing
// to accept from a provider. `null` means the delivery was well-formed but not
// actionable — an early lifecycle state, or one this build does not recognise.
export type TranslatedCalleEvent = {
  eventId: string;
  providerTaskId: string;
  status: AllowedCallbackStatus;
} | null;

const ACTIONABLE: ReadonlySet<string> = new Set([
  'ringing',
  'connected',
  'completed',
  'failed',
  'no_answer'
]);

@Injectable()
export class CalleWebhookTranslator {
  constructor(private readonly expectedToken: string | undefined = process.env.CALLE_WEBHOOK_TOKEN) {}

  // CALL-E's Phase 1 webhook does not document a signing scheme, so the route
  // is authenticated by a high-entropy token that only ever exists inside the
  // webhook_url handed to CALL-E. It is compared in constant time, and a
  // missing or short server-side token fails closed rather than open.
  public authenticate(presentedToken: string | undefined): void {
    const expected = (this.expectedToken ?? '').trim();
    if (expected.length < 24) {
      throw new CallbackAuthenticationError(
        'Server-side CALLE_WEBHOOK_TOKEN is missing or too short to authenticate a webhook'
      );
    }
    const presented = (presentedToken ?? '').trim();
    if (!presented) {
      throw new CallbackAuthenticationError('Webhook token is required');
    }
    // Hashing first makes the comparison length-independent, so the length of
    // the real token does not leak through a length check.
    const presentedHash = createHash('sha256').update(presented).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(presentedHash, expectedHash)) {
      throw new CallbackAuthenticationError('Invalid webhook token');
    }
  }

  // Deliberately lossy. CALL-E returns transcripts, recordings and structured
  // results on this webhook; none of them are read here, so none of them can be
  // persisted by accident. Structured outcomes are ingested separately, through
  // a schema-validated path with its own access controls.
  public translate(body: unknown): TranslatedCalleEvent {
    const record = asRecord(body);
    if (!record) {
      return null;
    }

    const providerTaskId = readBoundedString(body, ['call_id', 'callId', 'id', 'run_id', 'runId']);
    if (!providerTaskId) {
      return null;
    }

    const nested = asRecord(record.call) ?? asRecord(record.data) ?? asRecord(record.object);
    const rawStatus = record.status ?? record.state ?? nested?.status ?? nested?.state;
    const status = mapCalleStatus(rawStatus);
    if (!ACTIONABLE.has(status)) {
      return null;
    }

    // CALL-E may or may not supply its own event identifier. When it does not,
    // derive a deterministic one from the call and the state it reports: a
    // duplicate delivery of the same transition then hashes to the same event
    // ID and is recognised as an exact replay instead of double-applying.
    const suppliedEventId = readBoundedString(body, ['event_id', 'eventId', 'delivery_id']);
    const eventId =
      suppliedEventId ??
      `calle_${createHash('sha256').update(`${providerTaskId}.${status}`).digest('hex').slice(0, 40)}`;

    return { eventId, providerTaskId, status: status as AllowedCallbackStatus };
  }
}
