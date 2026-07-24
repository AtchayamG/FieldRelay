import { CallStatus } from '../domain/call-task.entity';
import { CallValidationError } from './errors';
import { decodeCallCursor } from './call-cursor';
import { CallTaskPage, TransactionPort } from './persistence.port';

export const DEFAULT_CALL_PAGE_SIZE = 20;
export const MAX_CALL_PAGE_SIZE = 100;

const CALL_STATUSES: readonly CallStatus[] = [
  'queued',
  'ringing',
  'connected',
  'completed',
  'failed',
  'no_answer',
  'outcome_unknown'
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ListCallsInput {
  limit?: number;
  cursor?: string;
  status?: string;
  incidentId?: string;
}

export class ListCallsUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: ListCallsInput = {}): Promise<CallTaskPage> {
    const limit = input.limit ?? DEFAULT_CALL_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CALL_PAGE_SIZE) {
      throw new CallValidationError(
        `limit must be an integer between 1 and ${MAX_CALL_PAGE_SIZE}`
      );
    }
    if (input.status !== undefined && !CALL_STATUSES.includes(input.status as CallStatus)) {
      throw new CallValidationError(`status must be one of: ${CALL_STATUSES.join(', ')}`);
    }
    if (input.incidentId !== undefined && !UUID_PATTERN.test(input.incidentId)) {
      throw new CallValidationError('incidentId must be a UUID');
    }
    if (input.cursor !== undefined) decodeCallCursor(input.cursor);

    return this.transactions.withTransaction((uow) =>
      uow.calls.list({
        limit,
        cursor: input.cursor,
        status: input.status as CallStatus | undefined,
        incidentId: input.incidentId
      })
    );
  }
}
