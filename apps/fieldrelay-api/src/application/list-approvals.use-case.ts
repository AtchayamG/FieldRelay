import { Approval, ApprovalStatus } from '../domain/approval.entity';
import { CallOutcome } from './call-outcome';
import { CallValidationError } from './errors';
import { TransactionPort } from './persistence.port';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const STATUSES: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

export interface ListApprovalsInput {
  limit?: number;
  cursor?: string;
  status?: string;
  incidentId?: string;
}

export interface ApprovalListEntry {
  approval: Approval;
  // The answer being decided on. An approval queue that made someone open a
  // second screen to see what they are approving would not get used.
  outcome: CallOutcome | null;
}

export interface ApprovalListResult {
  items: ApprovalListEntry[];
  nextCursor: string | null;
  pendingCount: number;
}

export class ListApprovalsUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: ListApprovalsInput = {}): Promise<ApprovalListResult> {
    const limit = input.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new CallValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    }
    if (input.status !== undefined && !STATUSES.includes(input.status as ApprovalStatus)) {
      throw new CallValidationError(`status must be one of: ${STATUSES.join(', ')}`);
    }
    if (input.incidentId !== undefined && !UUID_PATTERN.test(input.incidentId)) {
      throw new CallValidationError('incidentId must be a UUID');
    }

    return this.transactions.withTransaction(async (uow) => {
      const page = await uow.approvals.list({
        limit,
        cursor: input.cursor,
        status: input.status as ApprovalStatus | undefined,
        incidentId: input.incidentId
      });

      // Read inside the same transaction as the page, so a row and the answer
      // shown beside it always belong together.
      const items: ApprovalListEntry[] = [];
      for (const approval of page.items) {
        items.push({
          approval,
          outcome: await uow.outcomes.findByCallTaskId(approval.callTaskId)
        });
      }

      return {
        items,
        nextCursor: page.nextCursor,
        // Drives the navigation badge. Counted here rather than derived from
        // the page, which is filtered and paginated.
        pendingCount: await uow.approvals.countPending()
      };
    });
  }
}
