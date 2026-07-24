import { CallTask } from '../domain/call-task.entity';
import { CallValidationError, NotFoundError } from './errors';
import { TransactionPort } from './persistence.port';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetCallUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(id: string): Promise<CallTask> {
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      throw new CallValidationError('callTaskId must be a UUID');
    }
    const task = await this.transactions.withTransaction((uow) => uow.calls.findById(id));
    if (!task) {
      throw new NotFoundError(`Call task ${id} was not found`);
    }
    return task;
  }
}
