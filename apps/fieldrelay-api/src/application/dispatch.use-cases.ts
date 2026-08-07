import { randomUUID } from 'node:crypto';
import { Dispatch, DispatchInvariantError, DispatchStatus } from '../domain/dispatch.entity';
import { CallValidationError, NotFoundError } from './errors';
import { CallOutcome } from './call-outcome';
import { DispatchPage } from './dispatch.port';
import { TransactionPort } from './persistence.port';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 50;
const TERMINAL: DispatchStatus[] = ['completed', 'cancelled'];

export interface ReleaseDispatchInput {
  approvalId: string;
  dispatchedBy: string;
  scheduledFor?: string;
  correlationId: string;
}

// Turns an approved decision into a vendor who is actually coming.
//
// This is the only place in FieldRelay that creates an obligation to pay
// someone, so it is deliberately the narrowest use case in the application. It
// takes an approval id and nothing else that matters: the vendor, the incident
// and the quoted amount are all read from rows, never accepted from the caller.
// A request body cannot redirect a dispatch to a different vendor.
export class ReleaseDispatchUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: ReleaseDispatchInput): Promise<Dispatch> {
    if (typeof input.approvalId !== 'string' || !UUID_PATTERN.test(input.approvalId)) {
      throw new CallValidationError('approvalId must be a UUID');
    }

    let scheduledFor: Date | null = null;
    if (input.scheduledFor !== undefined && input.scheduledFor !== null && input.scheduledFor !== '') {
      const parsed = new Date(input.scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        throw new CallValidationError('scheduledFor must be an ISO-8601 timestamp');
      }
      scheduledFor = parsed;
    }

    return this.transactions.withTransaction(async (uow) => {
      const approval = await uow.approvals.findById(input.approvalId);
      if (!approval) {
        throw new NotFoundError(`Approval ${input.approvalId} was not found`);
      }

      // Releasing the same approval twice returns the existing dispatch rather
      // than creating a second one. A double-click, a retried request and a
      // refreshed tab must not put two vendors on one job.
      const existing = await uow.dispatches.findByApprovalId(approval.id);
      if (existing) {
        return existing;
      }

      const callTask = await uow.calls.findById(approval.callTaskId);
      if (!callTask) {
        throw new NotFoundError('The call behind this approval is no longer available');
      }
      const outcome = await uow.outcomes.findByCallTaskId(approval.callTaskId);

      const now = new Date();
      const dispatch = Dispatch.create({
        id: randomUUID(),
        displayId: await uow.dispatches.nextDisplayId(),
        incidentId: approval.incidentId,
        callTaskId: approval.callTaskId,
        approvalId: approval.id,
        // Read from the call task, so a dispatch always goes to the vendor who
        // was actually asked.
        contactId: callTask.authorizedContactId,
        quotedAmountText: readQuotedAmount(outcome),
        scheduledFor,
        dispatchedBy: input.dispatchedBy,
        dispatchedAt: now,
        approvalStatus: approval.status
      });

      await uow.dispatches.insert(dispatch);

      await uow.audit.append({
        actorType: 'user',
        actorId: input.dispatchedBy,
        action: 'dispatch.released',
        entityType: 'dispatch',
        entityId: dispatch.id,
        correlationId: input.correlationId,
        metadata: {
          approvalId: approval.id,
          callTaskId: approval.callTaskId,
          incidentId: approval.incidentId,
          contactId: dispatch.contactId,
          scheduled: scheduledFor !== null,
          // Whether a price was carried forward, never the price itself. The
          // figure came from a stranger on a telephone and the audit trail is
          // the wrong place to give it permanence.
          quotedAmountPresent: dispatch.quotedAmountText !== null
        }
      });

      return dispatch;
    });
  }
}

export interface AdvanceDispatchInput {
  dispatchId: string;
  to: DispatchStatus;
  actorId: string;
  reason?: string;
  correlationId: string;
}

export class AdvanceDispatchUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: AdvanceDispatchInput): Promise<Dispatch> {
    if (typeof input.dispatchId !== 'string' || !UUID_PATTERN.test(input.dispatchId)) {
      throw new CallValidationError('dispatchId must be a UUID');
    }
    const allowed: DispatchStatus[] = ['en_route', 'on_site', 'completed', 'cancelled'];
    if (!allowed.includes(input.to)) {
      throw new CallValidationError(`status must be one of ${allowed.join(', ')}`);
    }

    return this.transactions.withTransaction(async (uow) => {
      const dispatch = await uow.dispatches.findById(input.dispatchId);
      if (!dispatch) {
        throw new NotFoundError(`Dispatch ${input.dispatchId} was not found`);
      }

      const from = dispatch.status;
      // The entity owns which transitions are legal; this only translates the
      // refusal into an HTTP-shaped error.
      dispatch.advance({ to: input.to, at: new Date(), reason: input.reason ?? null });
      await uow.dispatches.update(dispatch);

      await uow.audit.append({
        actorType: 'user',
        actorId: input.actorId,
        action: `dispatch.${input.to}`,
        entityType: 'dispatch',
        entityId: dispatch.id,
        correlationId: input.correlationId,
        metadata: {
          from,
          to: input.to,
          incidentId: dispatch.incidentId,
          reasonProvided: Boolean(input.reason && input.reason.trim().length > 0)
        }
      });

      return dispatch;
    });
  }
}

export interface ListDispatchesInput {
  limit?: number;
  cursor?: string;
  status?: string;
  incidentId?: string;
}

export class ListDispatchesUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: ListDispatchesInput): Promise<DispatchPage> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), MAX_LIMIT);
    let status: DispatchStatus | undefined;
    if (input.status !== undefined && input.status !== '') {
      const valid: DispatchStatus[] = ['scheduled', 'en_route', 'on_site', 'completed', 'cancelled'];
      if (!valid.includes(input.status as DispatchStatus)) {
        throw new CallValidationError(`status must be one of ${valid.join(', ')}`);
      }
      status = input.status as DispatchStatus;
    }
    if (input.incidentId !== undefined && input.incidentId !== '' && !UUID_PATTERN.test(input.incidentId)) {
      throw new CallValidationError('incidentId must be a UUID');
    }

    return this.transactions.withTransaction((uow) =>
      uow.dispatches.list({ limit, cursor: input.cursor, status, incidentId: input.incidentId })
    );
  }
}

export function isTerminal(status: DispatchStatus): boolean {
  return TERMINAL.includes(status);
}

// The quoted amount is carried forward exactly as the vendor said it, or not at
// all. It is never parsed into a number: "$35, more if the valve is seized" has
// no correct numeric reading, and inventing one would commit the operator to a
// figure nobody agreed to.
function readQuotedAmount(outcome: CallOutcome | null): string | null {
  if (!outcome) {
    return null;
  }
  // A failed validation means the answer was not the one we asked for, so no
  // figure from it is carried into a commitment.
  if (outcome.validationFailed) {
    return null;
  }
  const raw = outcome.structuredResult['quoted_amount_text'];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
}

export { DispatchInvariantError };
