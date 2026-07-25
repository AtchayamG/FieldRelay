import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { AllowedCallbackStatus } from '@fieldrelay/contracts';
import { ProviderCallStatus } from '../domain/call-task.entity';
import {
  CallbackAuthenticationError,
  CallValidationError,
  IdempotencyConflictError
} from './errors';
import { TransactionPort } from './persistence.port';

const ALLOWED_STATUSES: Set<string> = new Set([
  'ringing',
  'connected',
  'completed',
  'failed',
  'no_answer'
]);

export interface AcceptCallbackInput {
  rawBody: Buffer;
  timestampHeader?: string;
  signatureHeader?: string;
  body: Record<string, unknown>;
  signingSecret?: string;
  correlationId?: string;
}

export type AcceptCallbackOutcome =
  | { type: 'accepted'; eventId: string }
  | { type: 'exact_replay'; eventId: string }
  | { type: 'conflict'; eventId: string };

export class ProcessProviderCallbackUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  // 1. Verify authentication headers and HMAC
  public verifySignature(
    rawBody: Buffer,
    timestampHeader: string | undefined,
    signatureHeader: string | undefined,
    signingSecret: string | undefined
  ): void {
    if (!signingSecret || signingSecret.trim().length < 16) {
      throw new CallbackAuthenticationError(
        'Server-side CALLBACK_SIGNING_SECRET is missing or weak'
      );
    }
    if (!timestampHeader || !signatureHeader) {
      throw new CallbackAuthenticationError(
        'x-fieldrelay-timestamp and x-fieldrelay-signature headers are required'
      );
    }

    const timestampSec = Number(timestampHeader);
    if (!Number.isFinite(timestampSec) || !Number.isInteger(timestampSec)) {
      throw new CallbackAuthenticationError('Malformed timestamp header');
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > 300) {
      throw new CallbackAuthenticationError('Timestamp is outside allowed 5-minute window');
    }

    const expectedHmacHex = createHmac('sha256', signingSecret)
      .update(`${timestampHeader}.`)
      .update(rawBody)
      .digest('hex');

    const cleanSigHex = signatureHeader.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(cleanSigHex)) {
      throw new CallbackAuthenticationError('Malformed signature hex string');
    }

    const sigBuf = Buffer.from(cleanSigHex, 'hex');
    const expBuf = Buffer.from(expectedHmacHex, 'hex');

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new CallbackAuthenticationError('Invalid callback signature');
    }
  }

  // 2. Validate DTO bounds (no transcript/outcome blobs)
  public validateDto(body: Record<string, unknown>): {
    eventId: string;
    providerTaskId: string;
    status: AllowedCallbackStatus;
  } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new CallValidationError('Callback body must be a JSON object');
    }

    // Check for forbidden transcript/outcome blobs
    const keys = Object.keys(body);
    const forbiddenKeys = ['transcript', 'outcome', 'audio', 'payload', 'recording', 'raw'];
    for (const key of keys) {
      if (forbiddenKeys.includes(key.toLowerCase())) {
        throw new CallValidationError(`Field "${key}" is not permitted in callback payload`);
      }
    }

    const eventId = body.eventId;
    if (typeof eventId !== 'string' || eventId.trim().length === 0 || eventId.length > 128) {
      throw new CallValidationError('eventId must be a non-empty string of at most 128 characters');
    }

    const providerTaskId = body.providerTaskId;
    if (
      typeof providerTaskId !== 'string' ||
      providerTaskId.trim().length === 0 ||
      providerTaskId.length > 128
    ) {
      throw new CallValidationError(
        'providerTaskId must be a non-empty string of at most 128 characters'
      );
    }

    const status = body.status as string;
    if (!status || !ALLOWED_STATUSES.has(status)) {
      throw new CallValidationError(
        `status must be one of: ringing, connected, completed, failed, no_answer`
      );
    }

    return {
      eventId: eventId.trim(),
      providerTaskId: providerTaskId.trim(),
      status: status as AllowedCallbackStatus
    };
  }

  // 3. Accept callback safely and deduplicate by event ID
  public async accept(input: AcceptCallbackInput): Promise<AcceptCallbackOutcome> {
    this.verifySignature(
      input.rawBody,
      input.timestampHeader,
      input.signatureHeader,
      input.signingSecret
    );
    const validated = this.validateDto(input.body);
    return this.acceptVerified(validated, input.rawBody);
  }

  // Deduplicate and record an already-authenticated, already-normalized event.
  // `accept` reaches this after verifying FieldRelay's own HMAC; the CALL-E
  // webhook route reaches it after verifying CALL-E's authentication and
  // translating its payload. Both share one replay-safety implementation so a
  // second ingestion path cannot drift from the first.
  public async acceptVerified(
    validated: { eventId: string; providerTaskId: string; status: AllowedCallbackStatus },
    rawBody: Buffer
  ): Promise<AcceptCallbackOutcome> {
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    const outcome = await this.transactions.withTransaction(async (uow) => {
      const existing = await uow.callbacks.findByEventId(validated.eventId);
      if (existing) {
        if (
          existing.providerTaskId === validated.providerTaskId &&
          existing.status === validated.status &&
          existing.payloadHash === payloadHash
        ) {
          return { type: 'exact_replay' as const, eventId: validated.eventId };
        }
        return { type: 'conflict' as const, eventId: validated.eventId };
      }

      await uow.callbacks.insert({
        eventId: validated.eventId,
        providerTaskId: validated.providerTaskId,
        status: validated.status as ProviderCallStatus,
        payloadHash,
        processed: false,
        processingOutcome: null,
        receivedAt: new Date(),
        processedAt: null
      });

      return { type: 'accepted' as const, eventId: validated.eventId };
    });

    if (outcome.type === 'conflict') {
      throw new IdempotencyConflictError(
        `Event ID ${validated.eventId} was already used with a conflicting payload`
      );
    }

    return outcome;
  }

  // 4. Asynchronous processing of accepted callback
  public async processAccepted(eventId: string): Promise<void> {
    await this.transactions.withTransaction(async (uow) => {
      const callback = await uow.callbacks.findByEventId(eventId);
      if (!callback || callback.processed) {
        return;
      }

      const now = new Date();
      const task = await uow.calls.findByProviderTaskId(callback.providerTaskId);

      if (!task) {
        await uow.callbacks.updateProcessingOutcome(eventId, 'rejected_unknown_task', now);
        await uow.audit.append({
          actorType: 'system',
          actorId: 'fieldrelay-api',
          action: 'call.callback.rejected_unknown_task',
          entityType: 'provider_callback',
          entityId: eventId,
          correlationId: `cb_${eventId}`,
          metadata: {
            providerTaskId: callback.providerTaskId,
            status: callback.status,
            reason: 'unknown_provider_task'
          }
        });
        return;
      }

      // Transition validation
      const currentStatus = task.status;
      const targetStatus = callback.status;

      if (currentStatus === targetStatus) {
        // Same-state delivery is a no-op
        await uow.callbacks.updateProcessingOutcome(eventId, 'same_state_noop', now);
        return;
      }

      const isTransitionValid = isValidTransition(currentStatus, targetStatus);
      if (!isTransitionValid) {
        await uow.callbacks.updateProcessingOutcome(
          eventId,
          'rejected_invalid_transition',
          now
        );
        await uow.audit.append({
          actorType: 'system',
          actorId: 'fieldrelay-api',
          action: 'call.callback.rejected_invalid_transition',
          entityType: 'call_task',
          entityId: task.id,
          correlationId: `cb_${eventId}`,
          metadata: {
            providerTaskId: callback.providerTaskId,
            currentStatus,
            requestedStatus: targetStatus,
            reason: 'regressive_or_invalid_transition'
          }
        });
        return;
      }

      // Valid forward transition or terminal reconciliation from outcome_unknown
      task.recordProviderResult({
        providerTaskId: callback.providerTaskId,
        status: targetStatus,
        simulated: task.simulated,
        at: now
      });

      await uow.calls.update(task);
      await uow.callbacks.updateProcessingOutcome(eventId, 'processed', now);
      await uow.audit.append({
        actorType: 'system',
        actorId: 'fieldrelay-api',
        action: 'call.callback.processed',
        entityType: 'call_task',
        entityId: task.id,
        correlationId: `cb_${eventId}`,
        metadata: {
          providerTaskId: callback.providerTaskId,
          previousStatus: currentStatus,
          newStatus: targetStatus,
          eventId
        }
      });
    });
  }
}

function isValidTransition(current: string, target: string): boolean {
  // Terminal states: completed, failed, no_answer cannot transition to non-terminal or regressive states
  if (['completed', 'failed', 'no_answer'].includes(current)) {
    return false;
  }

  // queued -> ringing, connected, completed, failed, no_answer
  if (current === 'queued') {
    return ['ringing', 'connected', 'completed', 'failed', 'no_answer'].includes(target);
  }

  // ringing -> connected, completed, failed, no_answer
  if (current === 'ringing') {
    return ['connected', 'completed', 'failed', 'no_answer'].includes(target);
  }

  // connected -> completed, failed, no_answer
  if (current === 'connected') {
    return ['completed', 'failed', 'no_answer'].includes(target);
  }

  // outcome_unknown -> completed, failed, no_answer (reconciliation by authenticated callback)
  if (current === 'outcome_unknown') {
    return ['completed', 'failed', 'no_answer'].includes(target);
  }

  return false;
}
