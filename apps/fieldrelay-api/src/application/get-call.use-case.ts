import { CallTask } from '../domain/call-task.entity';
import { CallOutcome } from './call-outcome';
import { CallValidationError, NotFoundError } from './errors';
import { TransactionPort } from './persistence.port';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CallTaskWithOutcome {
  task: CallTask;
  // Present only once a terminal webhook has delivered an answer. A queued or
  // in-flight call has no outcome, and neither does one that failed before
  // anybody spoke.
  outcome: CallOutcome | null;
}

export class GetCallUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(id: string): Promise<CallTaskWithOutcome> {
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      throw new CallValidationError('callTaskId must be a UUID');
    }

    // Both reads share a transaction so the outcome shown always belongs to the
    // task state shown, rather than being a snapshot from a moment later.
    const found = await this.transactions.withTransaction(async (uow) => {
      const task = await uow.calls.findById(id);
      if (!task) {
        return null;
      }
      return { task, outcome: await uow.outcomes.findByCallTaskId(id) };
    });

    if (!found) {
      throw new NotFoundError(`Call task ${id} was not found`);
    }
    return found;
  }
}
