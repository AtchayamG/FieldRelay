import { ProviderCallStatus } from '../../domain/call-task.entity';

// CALL-E's lifecycle vocabulary mapped onto the internal provider status set.
// Anything unrecognised stays `queued`: the call may well still be progressing,
// and inventing a terminal state here would be worse than waiting for the next
// webhook. `queued` is not an accepted callback transition, so an unrecognised
// value is ignored rather than acted on.
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
