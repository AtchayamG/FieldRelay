import { randomUUID } from 'node:crypto';
import { CallPurpose, CallStatus, CallTask } from '../domain/call-task.entity';
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
  displayId: string;
  providerTaskId: string;
  status: CallStatus;
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

    // --- Phase 1: atomically claim the key and persist the queued task. The
    // provider call is external I/O and must not run inside an open
    // transaction, so both records are committed before dialling.
    const callTaskId = randomUUID();
    const phaseOne = await this.transactions.withTransaction(async (uow) => {
      const reservation = await uow.idempotency.reserve(
        'call.start',
        idempotencyKey,
        requestHash,
        callTaskId
      );
      if (reservation.outcome !== 'reserved') {
        return { reservation, task: null };
      }

      const createdAt = new Date();
      const task = CallTask.create({
        id: callTaskId,
        displayId: await uow.calls.nextDisplayId(),
        incidentId: input.incidentId,
        provider: 'call-e',
        authorizedContactId: input.authorizedContactId,
        purpose: input.purpose as CallPurpose,
        simulated: true,
        timeoutSeconds,
        retries,
        createdAt
      });
      await uow.calls.insert(task);
      await uow.audit.append({
        actorType: 'system',
        actorId: 'fieldrelay-api',
        action: 'call.start.queued',
        entityType: 'call_task',
        entityId: task.id,
        correlationId,
        metadata: {
          incidentId: input.incidentId,
          authorizedContactId: input.authorizedContactId,
          purpose: input.purpose,
          simulated: true,
          requestHash
        }
      });
      return { reservation, task };
    });
    const reservation = phaseOne.reservation;

    if (reservation.outcome === 'mismatch') {
      await this.recordSuppressed(input, correlationId, 'request_mismatch');
      throw new IdempotencyConflictError(
        'Idempotency-Key was already used for a different call request'
      );
    }
    if (reservation.outcome === 'in_progress') {
      await this.recordSuppressed(input, correlationId, 'already_in_progress');
      throw new OperationInProgressError(
        'A call with this Idempotency-Key is already in progress'
      );
    }
    if (reservation.outcome === 'completed') {
      const result = reservation.result as StartCallResult;
      await this.recordSuppressed(input, correlationId, 'already_completed');
      return { ...result, replayed: true };
    }

    // --- Phase 2: the reservation and queued task are durable; place exactly
    // one call with no database transaction held open. ---
    const callTask = phaseOne.task;
    if (!callTask) {
      throw new Error('Reserved call did not produce a durable call task');
    }

    let providerResult: CallEResult;
    try {
      providerResult = await this.callEPort.startCall(callTask);
    } catch (error) {
      callTask.markOutcomeUnknown(new Date());
      await this.transactions.withTransaction(async (uow) => {
        await uow.calls.update(callTask);
        await uow.audit.append({
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
        });
      });
      throw error;
    }

    callTask.recordProviderResult({ ...providerResult, at: new Date() });

    const result: StartCallResult = {
      callTaskId: callTask.id,
      displayId: callTask.displayId,
      providerTaskId: providerResult.providerTaskId,
      status: providerResult.status,
      simulated: providerResult.simulated
    };

    // --- Phase 3: record the outcome so replays of this key never dial. ---
    await this.transactions.withTransaction(async (uow) => {
      await uow.calls.update(callTask);
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

  private async recordSuppressed(
    input: StartCallInput,
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
