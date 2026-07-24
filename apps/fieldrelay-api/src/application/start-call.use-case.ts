import { randomUUID } from 'node:crypto';
import { CallPurpose, CallTask } from '../domain/call-task.entity';
import { CallEPort, CallEResult } from './call-e.port';
import { ContactAuthorizationPort } from './contact-authorization.port';
import {
  CallAuthorizationError,
  CallValidationError,
  IdempotencyConflictError,
  NotFoundError,
  OperationInProgressError
} from './errors';
import { TransactionPort } from './persistence.port';
import { hashRequest, requireIdempotencyKey } from './request-hash';

// Bounds enforced before any provider is invoked. Kept small and explicit
// rather than configurable — a single demo slice needs no tuning surface.
export const MIN_TIMEOUT_SECONDS = 30;
export const MAX_TIMEOUT_SECONDS = 900;
export const DEFAULT_TIMEOUT_SECONDS = 300;
export const MAX_RETRIES = 3;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StartCallInput {
  incidentId: string;
  authorizedContactId: string;
  purpose: string;
  idempotencyKey: string;
  correlationId?: string;
  timeoutSeconds?: number;
  retries?: number;
}

export interface StartCallResult {
  callTaskId: string;
  providerTaskId: string;
  status: CallEResult['status'];
  simulated: boolean;
}

export interface StartCallOutput extends StartCallResult {
  // true when this request replayed an earlier one with the same key. The
  // provider was not contacted again.
  replayed: boolean;
}

// Plain class — no Nest decorators. Dependencies are injected by the module via
// a factory so the application layer never imports the framework.
export class StartCallUseCase {
  constructor(
    private readonly callEPort: CallEPort,
    private readonly contacts: ContactAuthorizationPort,
    private readonly transactions: TransactionPort
  ) {}

  public async execute(input: StartCallInput): Promise<StartCallOutput> {
    const timeoutSeconds = input.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const retries = input.retries ?? 0;

    // --- Input guards (all must pass before the provider is touched) ---
    if (typeof input.incidentId !== 'string' || !UUID_PATTERN.test(input.incidentId)) {
      throw new CallValidationError('incidentId must be a UUID');
    }
    this.requireNonEmpty(input.authorizedContactId, 'authorizedContactId is required');
    this.requireNonEmpty(input.purpose, 'purpose is required');
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
    this.requireBoundedInt(
      timeoutSeconds,
      MIN_TIMEOUT_SECONDS,
      MAX_TIMEOUT_SECONDS,
      'timeoutSeconds'
    );
    this.requireBoundedInt(retries, 0, MAX_RETRIES, 'retries');

    // A call is an incident-owned side effect. Refuse orphan calls before
    // resolving a contact or reserving an idempotency key.
    const incident = await this.transactions.withTransaction((uow) =>
      uow.incidents.findById(input.incidentId)
    );
    if (!incident) {
      throw new NotFoundError(`Incident ${input.incidentId} was not found`);
    }

    // --- Authorization guard: resolve the contact behind the repository
    // boundary and confirm it is authorized for this specific purpose. ---
    const contact = await this.contacts.resolve(input.authorizedContactId);
    if (!contact || contact.authorizationStatus !== 'authorized') {
      throw new CallAuthorizationError('Contact is not authorized to be called');
    }
    if (!contact.allowedPurposes.includes(input.purpose as CallPurpose)) {
      throw new CallAuthorizationError(`Purpose "${input.purpose}" is not permitted for this contact`);
    }

    // Hash the normalized request so an omitted timeout and an explicit
    // default hash identically, while any material change does not.
    const requestHash = hashRequest({
      incidentId: input.incidentId,
      authorizedContactId: input.authorizedContactId,
      purpose: input.purpose,
      timeoutSeconds,
      retries
    });

    const correlationId = input.correlationId ?? randomUUID();

    // --- Phase 1: claim the key in its own committed transaction. The
    // provider call is external I/O and must not run inside an open
    // transaction, so the reservation is committed before dialling.
    //
    // ponytail: a crash between phase 1 and phase 3 leaves the key claimed and
    // later retries get 409 until it is cleared. That is the safe direction —
    // the alternative double-dials a real person. Add a reaper over
    // operation_idempotency (state, created_at) when unattended recovery is
    // needed. ---
    const reservation = await this.transactions.withTransaction((uow) =>
      uow.idempotency.reserve('call.start', idempotencyKey, requestHash)
    );

    if (reservation.outcome === 'mismatch') {
      await this.recordSuppressed(input, idempotencyKey, correlationId, 'request_mismatch');
      throw new IdempotencyConflictError(
        'Idempotency-Key was already used for a different call request'
      );
    }
    if (reservation.outcome === 'in_progress') {
      // An earlier request already reached the provider with this key. Placing
      // a second call would dial the contact twice.
      await this.recordSuppressed(input, idempotencyKey, correlationId, 'already_in_progress');
      throw new OperationInProgressError(
        'A call with this Idempotency-Key is already in progress'
      );
    }
    if (reservation.outcome === 'completed') {
      const result = reservation.result as StartCallResult;
      await this.recordSuppressed(input, idempotencyKey, correlationId, 'already_completed');
      return { ...result, replayed: true };
    }

    // --- Phase 2: the reservation is ours; place exactly one call. ---
    const callTask = CallTask.create({
      id: `CALL-E-${randomUUID()}`,
      incidentId: input.incidentId,
      authorizedContactId: input.authorizedContactId,
      purpose: input.purpose as CallPurpose,
      idempotencyKey,
      timeoutSeconds,
      retries
    });
    callTask.queue();

    let providerResult: CallEResult;
    try {
      providerResult = await this.callEPort.startCall(callTask);
    } catch (error) {
      // A transport error cannot prove that the provider did not accept the
      // task. Keep the reservation in progress so a retry cannot place a
      // duplicate call; reconciliation must resolve the ambiguous outcome.
      await this.transactions.withTransaction((uow) =>
        uow.audit.append({
          actorType: 'system',
          actorId: 'fieldrelay-api',
          action: 'call.start.outcome_unknown',
          entityType: 'call_task',
          entityId: callTask.id,
          correlationId,
          metadata: {
            incidentId: input.incidentId,
            authorizedContactId: input.authorizedContactId,
            purpose: input.purpose,
            requestHash,
            reason: error instanceof Error ? error.message : 'unknown provider failure'
          }
        })
      );
      throw error;
    }

    const result: StartCallResult = {
      callTaskId: callTask.id,
      providerTaskId: providerResult.providerTaskId,
      status: providerResult.status,
      simulated: providerResult.simulated
    };

    // --- Phase 3: record the outcome so replays of this key never dial. ---
    await this.transactions.withTransaction(async (uow) => {
      await uow.idempotency.complete('call.start', idempotencyKey, result);
      await uow.audit.append({
        actorType: 'system',
        actorId: 'fieldrelay-api',
        action: 'call.start.completed',
        entityType: 'call_task',
        entityId: callTask.id,
        correlationId,
        metadata: {
          incidentId: input.incidentId,
          authorizedContactId: input.authorizedContactId,
          purpose: input.purpose,
          providerTaskId: result.providerTaskId,
          status: result.status,
          simulated: result.simulated,
          requestHash
        }
      });
    });

    return { ...result, replayed: false };
  }

  // Every suppressed duplicate is auditable: the evidence that a second call
  // was requested and not placed matters as much as the call itself.
  private async recordSuppressed(
    input: StartCallInput,
    idempotencyKey: string,
    correlationId: string,
    reason: string
  ): Promise<void> {
    await this.transactions.withTransaction((uow) =>
      uow.audit.append({
        actorType: 'system',
        actorId: 'fieldrelay-api',
        action: 'call.start.duplicate_suppressed',
        entityType: 'incident',
        entityId: input.incidentId,
        correlationId,
        metadata: {
          authorizedContactId: input.authorizedContactId,
          purpose: input.purpose,
          reason
        }
      })
    );
  }

  private requireNonEmpty(value: string, message: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new CallValidationError(message);
    }
  }

  private requireBoundedInt(value: number, min: number, max: number, field: string): void {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new CallValidationError(`${field} must be an integer between ${min} and ${max}`);
    }
  }
}
