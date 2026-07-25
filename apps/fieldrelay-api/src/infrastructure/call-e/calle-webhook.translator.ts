import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AllowedCallbackStatus } from '@fieldrelay/contracts';
import { CallbackAuthenticationError } from '../../application/errors';
import {
  asRecord,
  mapCalleStatus,
  mapCalleWebhookEventType,
  readBoundedString
} from './calle-status';

export const CALLE_WEBHOOK_TRANSLATOR = Symbol('CALLE_WEBHOOK_TRANSLATOR');

// A CALL-E lifecycle event, reduced to the three fields FieldRelay is willing
// to accept from a provider. `null` means the delivery was well-formed but not
// actionable — an early lifecycle state, or one this build does not recognise.
export type TranslatedCalleEvent = {
  eventId: string;
  providerTaskId: string;
  status: AllowedCallbackStatus;
} | null;

// A duplicate delivery of the same transition hashes to the same event ID, so
// it is recognised as an exact replay instead of being applied twice.
function deriveEventId(callId: string, status: string): string {
  return `calle_${createHash('sha256').update(`${callId}.${status}`).digest('hex').slice(0, 40)}`;
}

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

    // Documented terminal envelope (OpenAPI v0.6.0 `WebhookEvent`):
    //   { id, type, created_at, data: { id, status, ... } }
    // `id` at the top level is the *webhook event* id, while the call id lives
    // at `data.id`. Reading the call id from the envelope root would silently
    // bind every callback to a provider task that does not exist, so the
    // envelope is matched first and only then fallen back on.
    const data = asRecord(record.data);
    const eventType = mapCalleWebhookEventType(record.type);
    if (data && eventType) {
      const callId = readBoundedString(data, ['id', 'call_id', 'callId']);
      if (!callId) {
        return null;
      }
      // CALL-E documents the webhook event id as an idempotency key, so it is
      // used verbatim: a redelivery of the same event is recognised as an exact
      // replay rather than applied twice.
      const eventId =
        readBoundedString(record, ['id', 'event_id', 'eventId']) ??
        deriveEventId(callId, eventType);
      return { eventId, providerTaskId: callId, status: eventType as AllowedCallbackStatus };
    }

    // Fallback for any non-envelope delivery shape (for example a status-only
    // ping). Deliberately conservative: it must carry its own call identifier.
    const providerTaskId = readBoundedString(record, ['call_id', 'callId', 'run_id', 'runId']);
    if (!providerTaskId) {
      return null;
    }

    const nested = asRecord(record.call) ?? asRecord(record.object);
    const status = mapCalleStatus(record.status ?? record.state ?? nested?.status ?? nested?.state);
    if (!ACTIONABLE.has(status)) {
      return null;
    }

    const eventId =
      readBoundedString(record, ['event_id', 'eventId', 'delivery_id']) ??
      deriveEventId(providerTaskId, status);

    return { eventId, providerTaskId, status: status as AllowedCallbackStatus };
  }
}
