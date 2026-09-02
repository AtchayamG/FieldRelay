import { CallEReadPort } from '../application/call-e.port';
import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import { ReconcileProviderCallUseCase } from '../application/reconcile-provider-call.use-case';
import { CallTask } from '../domain/call-task.entity';
import { Incident } from '../domain/incident.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

describe('ReconcileProviderCallUseCase', () => {
  const callTaskId = '11111111-2222-4333-8444-555555555555';
  let transactions: InMemoryTransactionManager;
  let provider: jest.Mocked<CallEReadPort>;
  let useCase: ReconcileProviderCallUseCase;

  beforeEach(async () => {
    transactions = new InMemoryTransactionManager(new InMemoryDatabase());
    provider = { getCall: jest.fn() };
    const callbacks = new ProcessProviderCallbackUseCase(transactions);
    useCase = new ReconcileProviderCallUseCase(provider, transactions, callbacks);

    await transactions.withTransaction(async (uow) => {
      const incident = Incident.create({
        id: '99999999-8888-4777-8666-555555555555',
        displayId: 'INC-2042-0099',
        propertyId: 'PROP-TEST',
        unit: '1A',
        type: 'plumbing',
        priority: 'high',
        description: 'Fictional reconciliation test incident.',
        reportedBy: 'Test Operator',
        createdAt: new Date('2026-09-02T00:00:00.000Z')
      });
      await uow.incidents.insert(incident);
      const task = CallTask.create({
        id: callTaskId,
        displayId: 'CALL-2042-0099',
        incidentId: incident.id,
        provider: 'call-e',
        purpose: 'vendor_availability',
        authorizedContactId: 'CNS-4491',
        simulated: false,
        timeoutSeconds: 300,
        retries: 0,
        createdAt: new Date('2026-09-02T00:01:00.000Z')
      });
      task.recordProviderResult({
        providerTaskId: 'call_existing_1',
        status: 'queued',
        simulated: false,
        at: new Date('2026-09-02T00:01:01.000Z')
      });
      await uow.calls.insert(task);
    });
  });

  it('applies a terminal provider snapshot exactly once without creating a call', async () => {
    provider.getCall.mockResolvedValue({
      providerTaskId: 'call_existing_1',
      status: 'completed',
      outcome: {
        structuredResult: { available: 'unknown' },
        taskCompleted: false,
        confidence: { score: 0.2, label: 'low' }
      }
    });

    await expect(useCase.execute(callTaskId)).resolves.toEqual({
      status: 'completed',
      applied: true
    });
    await expect(useCase.execute(callTaskId)).resolves.toEqual({
      status: 'completed',
      applied: false
    });
    expect(provider.getCall).toHaveBeenCalledTimes(1);

    const state = await transactions.withTransaction(async (uow) => ({
      task: await uow.calls.findById(callTaskId),
      outcome: await uow.outcomes.findByCallTaskId(callTaskId),
      approval: await uow.approvals.findByCallTaskId(callTaskId)
    }));
    expect(state.task?.status).toBe('completed');
    expect(state.outcome).toMatchObject({
      structuredResult: { available: 'unknown' },
      taskCompleted: false,
      validationFailed: false
    });
    expect(state.approval).not.toBeNull();
  });

  it('leaves an in-flight provider snapshot unchanged', async () => {
    provider.getCall.mockResolvedValue({
      providerTaskId: 'call_existing_1',
      status: 'connected'
    });

    await expect(useCase.execute(callTaskId)).resolves.toEqual({
      status: 'queued',
      applied: false
    });
    const task = await transactions.withTransaction((uow) => uow.calls.findById(callTaskId));
    expect(task?.status).toBe('queued');
  });

  it('refuses a provider snapshot for a different call identifier', async () => {
    provider.getCall.mockResolvedValue({
      providerTaskId: 'call_different_1',
      status: 'completed'
    });

    await expect(useCase.execute(callTaskId)).rejects.toThrow(
      'The provider returned a different call identifier'
    );
    const task = await transactions.withTransaction((uow) => uow.calls.findById(callTaskId));
    expect(task?.status).toBe('queued');
  });
});
