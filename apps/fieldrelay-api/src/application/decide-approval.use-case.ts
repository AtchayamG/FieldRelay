import { Approval, ApprovalInvariantError, ApprovalStatus } from '../domain/approval.entity';
import { CallOutcome } from './call-outcome';
import { CallValidationError, NotFoundError } from './errors';
import { TransactionPort } from './persistence.port';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DecideApprovalInput {
  approvalId: string;
  decision: Exclude<ApprovalStatus, 'pending'>;
  decidedBy: string;
  decisionNote?: string;
  correlationId: string;
}

export interface ApprovalWithOutcome {
  approval: Approval;
  outcome: CallOutcome | null;
}

// Records an accountable human decision over a validated call outcome.
//
// Two refusals matter more than the happy path:
//   * a second decision on an already-decided approval, because the first one
//     is the accountable one and overwriting it would erase who committed;
//   * a decision made against an outcome that has since changed, because the
//     approver would be agreeing to something they never read.
export class DecideApprovalUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: DecideApprovalInput): Promise<ApprovalWithOutcome> {
    if (typeof input.approvalId !== 'string' || !UUID_PATTERN.test(input.approvalId)) {
      throw new CallValidationError('approvalId must be a UUID');
    }
    if (input.decision !== 'approved' && input.decision !== 'rejected') {
      throw new CallValidationError('decision must be either approved or rejected');
    }
    const note = (input.decisionNote ?? '').trim();
    if (note.length > 500) {
      throw new CallValidationError('decisionNote must be at most 500 characters');
    }

    return this.transactions.withTransaction(async (uow) => {
      const approval = await uow.approvals.findById(input.approvalId);
      if (!approval) {
        throw new NotFoundError(`Approval ${input.approvalId} was not found`);
      }

      const outcome = await uow.outcomes.findByCallTaskId(approval.callTaskId);
      if (!outcome) {
        // The approval exists because an outcome did. If it has gone, the
        // decision has no subject and must not be recorded.
        throw new ApprovalInvariantError(
          'The call outcome behind this approval is no longer available'
        );
      }

      const at = new Date();
      approval.decide({
        status: input.decision,
        decidedBy: input.decidedBy,
        decisionNote: note.length > 0 ? note : null,
        at,
        currentOutcomeReceivedAt: outcome.receivedAt
      });
      await uow.approvals.update(approval);

      await uow.audit.append({
        actorType: 'user',
        actorId: input.decidedBy,
        action: input.decision === 'approved' ? 'approval.approved' : 'approval.rejected',
        entityType: 'approval',
        entityId: approval.id,
        correlationId: input.correlationId,
        metadata: {
          callTaskId: approval.callTaskId,
          incidentId: approval.incidentId,
          reasons: approval.reasons,
          // Whether a note was left, not what it said: the note may quote the
          // call, and the audit log has no retention rules for that yet.
          noteProvided: note.length > 0
        }
      });

      return { approval, outcome };
    });
  }
}
