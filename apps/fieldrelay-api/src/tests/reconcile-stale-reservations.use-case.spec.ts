import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { ReconcileStaleReservationsUseCase } from '../application/reconcile-stale-reservations.use-case';
import { CallTask } from '../domain/call-task.entity';

describe('ReconcileStaleReservationsUseCase', () => {
  let db: InMemoryDatabase;
  let transactions: InMemoryTransactionManager;
  let useCase: ReconcileStaleReservationsUseCase;

  beforeEach(() => {
    db = new InMemoryDatabase();
    transactions = new InMemoryTransactionManager(db);
    useCase = new ReconcileStaleReservationsUseCase(transactions);
  });

  async function createQueuedTask(id: string) {
    const task = CallTask.create({
      id,
      displayId: `CALL-2042-${id.slice(0, 4)}`,
      incidentId: '00000000-0000-0000-0000-000000000001',
      provider: 'call-e',
      authorizedContactId: 'CNS-001',
      purpose: 'vendor_availability',
      simulated: true,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date()
    });
    await transactions.withTransaction((uow) => uow.calls.insert(task));
    return task;
  }

  it('reconciles only in_progress reservations created before the cutoff', async () => {
    const task1 = await createQueuedTask('task_old');
    const task2 = await createQueuedTask('task_new');

    const pastDate = new Date(Date.now() - 1000 * 60 * 10); // 10 minutes ago
    const recentDate = new Date(); // now

    // Manually insert stale reservation (10 minutes old)
    db.idempotency.set('call.start::key_old', {
      operation: 'call.start',
      key: 'key_old',
      requestHash: 'hash_old',
      state: 'in_progress',
      callTaskId: task1.id,
      createdAt: pastDate
    });

    // Manually insert recent reservation (now)
    db.idempotency.set('call.start::key_new', {
      operation: 'call.start',
      key: 'key_new',
      requestHash: 'hash_new',
      state: 'in_progress',
      callTaskId: task2.id,
      createdAt: recentDate
    });

    const cutoff = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago

    const result = await useCase.execute({ cutoff });

    expect(result.reconciledCount).toBe(1);
    expect(result.items[0].key).toBe('key_old');

    const updatedTask1 = await transactions.withTransaction((uow) => uow.calls.findById(task1.id));
    expect(updatedTask1?.status).toBe('outcome_unknown');

    const updatedTask2 = await transactions.withTransaction((uow) => uow.calls.findById(task2.id));
    expect(updatedTask2?.status).toBe('queued');

    // Idempotency record for key_old is now completed
    const recordOld = db.idempotency.get('call.start::key_old');
    expect(recordOld?.state).toBe('completed');
    expect(recordOld?.result).toMatchObject({
      callTaskId: task1.id,
      status: 'outcome_unknown'
    });
  });

  it('enforces a hard maximum batch size bound of 100', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 10);

    // Create 120 stale reservations
    for (let i = 0; i < 120; i++) {
      const taskId = `task_batch_${i}`;
      await createQueuedTask(taskId);
      db.idempotency.set(`call.start::key_${i}`, {
        operation: 'call.start',
        key: `key_${i}`,
        requestHash: `hash_${i}`,
        state: 'in_progress',
        callTaskId: taskId,
        createdAt: new Date(pastDate.getTime() + i * 10)
      });
    }

    const cutoff = new Date();
    const result = await useCase.execute({ cutoff, limit: 150 });

    expect(result.reconciledCount).toBe(100);
  });

  it('handles missing or null call task IDs deterministically and safely', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 10);

    db.idempotency.set('call.start::key_null_task', {
      operation: 'call.start',
      key: 'key_null_task',
      requestHash: 'hash_1',
      state: 'in_progress',
      callTaskId: null,
      createdAt: pastDate
    });

    db.idempotency.set('call.start::key_missing_task', {
      operation: 'call.start',
      key: 'key_missing_task',
      requestHash: 'hash_2',
      state: 'in_progress',
      callTaskId: 'non_existent_task_id_999',
      createdAt: pastDate
    });

    const cutoff = new Date();
    const result = await useCase.execute({ cutoff });

    expect(result.reconciledCount).toBe(2);

    const rec1 = db.idempotency.get('call.start::key_null_task');
    expect(rec1?.state).toBe('completed');

    const rec2 = db.idempotency.get('call.start::key_missing_task');
    expect(rec2?.state).toBe('completed');
  });

  it('does not overwrite status if call task is already terminal or progressed', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 10);
    const task = await createQueuedTask('task_completed');
    task.recordProviderResult({
      providerTaskId: 'pt_done',
      status: 'completed',
      simulated: true,
      at: new Date()
    });
    await transactions.withTransaction((uow) => uow.calls.update(task));

    db.idempotency.set('call.start::key_terminal', {
      operation: 'call.start',
      key: 'key_terminal',
      requestHash: 'hash_term',
      state: 'in_progress',
      callTaskId: task.id,
      createdAt: pastDate
    });

    const cutoff = new Date();
    const result = await useCase.execute({ cutoff });

    expect(result.reconciledCount).toBe(1);
    expect(result.items[0].status).toBe('completed');

    const updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
    expect(updatedTask?.status).toBe('completed'); // Not overwritten to outcome_unknown!

    const record = db.idempotency.get('call.start::key_terminal');
    expect(record?.state).toBe('completed');
    expect(record?.result).toMatchObject({
      callTaskId: task.id,
      status: 'completed'
    });
  });
});
