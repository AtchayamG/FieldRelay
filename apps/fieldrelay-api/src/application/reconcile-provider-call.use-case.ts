import { createHash } from 'node:crypto';
import { AllowedCallbackStatus } from '@fieldrelay/contracts';
import { CallEReadPort } from './call-e.port';
import { CallValidationError, NotFoundError } from './errors';
import { ProcessProviderCallbackUseCase } from './process-provider-callback.use-case';
import { TransactionPort } from './persistence.port';
import { CallStatus } from '../domain/call-task.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'no_answer']);

export interface ReconcileProviderCallResult {
  status: CallStatus;
  applied: boolean;
}

// Repairs a missed webhook by reading one already-created provider call. It
// has no path to start or retry a call, so reconciliation cannot redial.
export class ReconcileProviderCallUseCase {
  constructor(
    private readonly provider: CallEReadPort,
    private readonly transactions: TransactionPort,
    private readonly callbacks: ProcessProviderCallbackUseCase
  ) {}

  public async execute(callTaskId: string): Promise<ReconcileProviderCallResult> {
    if (typeof callTaskId !== 'string' || !UUID_PATTERN.test(callTaskId)) {
      throw new CallValidationError('callTaskId must be a UUID');
    }

    const task = await this.transactions.withTransaction((uow) => uow.calls.findById(callTaskId));
    if (!task) {
      throw new NotFoundError(`Call task ${callTaskId} was not found`);
    }
    if (task.simulated) {
      throw new CallValidationError('A simulated call has no live provider state to reconcile');
    }
    if (!task.providerTaskId) {
      throw new CallValidationError('The call has no provider task identifier to reconcile');
    }
    if (TERMINAL.has(task.status)) {
      return { status: task.status, applied: false };
    }

    const snapshot = await this.provider.getCall(task.providerTaskId);
    if (snapshot.providerTaskId !== task.providerTaskId) {
      throw new CallValidationError('The provider returned a different call identifier');
    }
    if (!isTerminal(snapshot.status)) {
      return { status: task.status, applied: false };
    }

    const normalized = {
      providerTaskId: snapshot.providerTaskId,
      status: snapshot.status,
      ...(snapshot.outcome ? { outcome: snapshot.outcome } : {})
    };
    const rawBody = Buffer.from(JSON.stringify(normalized));
    const digest = createHash('sha256').update(rawBody).digest('hex').slice(0, 40);
    const eventId = `calle_reconcile_${digest}`;
    const accepted = await this.callbacks.acceptVerified(
      { eventId, ...normalized },
      rawBody
    );
    await this.callbacks.processAccepted(eventId);

    return { status: snapshot.status, applied: accepted.type === 'accepted' };
  }
}

function isTerminal(status: string): status is AllowedCallbackStatus {
  return TERMINAL.has(status);
}
