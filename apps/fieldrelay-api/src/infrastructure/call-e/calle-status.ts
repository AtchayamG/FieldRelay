import { ProviderCallStatus } from '../../domain/call-task.entity';

// CALL-E's lifecycle vocabulary mapped onto the internal provider status set.
// Anything unrecognised stays `queued`: the call may well still be progressing,
// and inventing a terminal state here would be worse than waiting for the next
// webhook. `queued` is not an accepted callback transition, so an unrecognised
// value is ignored rather than acted on.
// Verified against the CALL-E Developer API OpenAPI document (v0.6.0):
//   CallStatus    : queued | in_progress | completed | failed | canceled
//   AttemptStatus : queued | dialing | in_progress | completed | failed | canceled
// The extra keys below are tolerated aliases, not invented states.
const STATUS_MAP: Record<string, ProviderCallStatus> = {
  queued: 'queued',
  pending: 'queued',
  created: 'queued',
  scheduled: 'queued',
  planning: 'queued',
  dialing: 'ringing',
  ringing: 'ringing',
  in_progress: 'connected',
  connected: 'connected',
  active: 'connected',
  completed: 'completed',
  succeeded: 'completed',
  success: 'completed',
  failed: 'failed',
  error: 'failed',
  cancelled: 'failed',
  canceled: 'failed',
  no_answer: 'no_answer',
  noanswer: 'no_answer',
  busy: 'no_answer',
  voicemail: 'no_answer',
  unanswered: 'no_answer'
};

export function mapCalleStatus(raw: unknown): ProviderCallStatus {
  if (typeof raw !== 'string') {
    return 'queued';
  }
  return STATUS_MAP[raw.trim().toLowerCase()] ?? 'queued';
}

// Terminal webhook event types, per the OpenAPI document's WebhookEventType:
//   call.completed | call.failed | call.result_validation_failed
//
// `call.result_validation_failed` means the conversation happened but the
// answer did not satisfy the declared result schema. That is a completed call
// with an unusable result, not a failed call, so it maps to `completed` and is
// left for the outcome-validation path to judge rather than being silently
// downgraded to a failure.
const WEBHOOK_EVENT_MAP: Record<string, ProviderCallStatus> = {
  'call.completed': 'completed',
  'call.failed': 'failed',
  'call.result_validation_failed': 'completed'
};

export function mapCalleWebhookEventType(raw: unknown): ProviderCallStatus | null {
  if (typeof raw !== 'string') {
    return null;
  }
  return WEBHOOK_EVENT_MAP[raw.trim().toLowerCase()] ?? null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// Reads a bounded string from the first matching key across a payload and one
// level of common envelope nesting. The beta API documents `call_id`; the
// aliases exist so a real call is not lost to a field-name change.
export function readBoundedString(
  payload: unknown,
  keys: readonly string[],
  maxLength = 128
): string | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }
  const nested = asRecord(record.call) ?? asRecord(record.data) ?? asRecord(record.object);
  for (const source of [record, nested]) {
    if (!source) {
      continue;
    }
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength) {
        return value.trim();
      }
    }
  }
  return null;
}
