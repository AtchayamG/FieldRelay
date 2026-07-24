import { GetCallUseCase } from '../application/get-call.use-case';
import { ListCallsUseCase } from '../application/list-calls.use-case';
import { CallValidationError, NotFoundError } from '../application/errors';
import { CallTask } from '../domain/call-task.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

const INCIDENT_A = '11111111-1111-4111-8111-111111111101';
const INCIDENT_B = '11111111-1111-4111-8111-111111111102';

describe('call query use cases', () => {
  let db: InMemoryDatabase;
  let list: ListCallsUseCase;
  let get: GetCallUseCase;

  beforeEach(() => {
    db = new InMemoryDatabase();
    db.callTasks.push(
      task('11111111-1111-4111-8111-111111111201', INCIDENT_A, '2042-03-01T10:00:00Z'),
      task('11111111-1111-4111-8111-111111111202', INCIDENT_B, '2042-03-01T09:00:00Z'),
      task('11111111-1111-4111-8111-111111111203', INCIDENT_A, '2042-03-01T08:00:00Z')
    );
    const transactions = new InMemoryTransactionManager(db);
    list = new ListCallsUseCase(transactions);
    get = new GetCallUseCase(transactions);
  });

  it('lists with bounded cursor pagination and incident filtering', async () => {
    const first = await list.execute({ limit: 1, incidentId: INCIDENT_A });
    const second = await list.execute({
      limit: 1,
      incidentId: INCIDENT_A,
      cursor: first.nextCursor ?? undefined
    });

    expect(first.items.map((item) => item.id)).toEqual([
      '11111111-1111-4111-8111-111111111201'
    ]);
    expect(first.nextCursor).not.toBeNull();
    expect(second.items.map((item) => item.id)).toEqual([
      '11111111-1111-4111-8111-111111111203'
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it('gets a call and returns stable validation/not-found errors', async () => {
    await expect(get.execute('not-a-uuid')).rejects.toBeInstanceOf(CallValidationError);
    await expect(
      get.execute('11111111-1111-4111-8111-111111119999')
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      get.execute('11111111-1111-4111-8111-111111111202')
    ).resolves.toMatchObject({ incidentId: INCIDENT_B, simulated: true });
  });

  it('rejects invalid filters and page sizes', async () => {
    await expect(list.execute({ status: 'draft' })).rejects.toBeInstanceOf(
      CallValidationError
    );
    await expect(list.execute({ limit: 101 })).rejects.toBeInstanceOf(
      CallValidationError
    );
  });
});

function task(id: string, incidentId: string, createdAt: string): CallTask {
  return CallTask.create({
    id,
    displayId: `CALL-2042-${id.slice(-4)}`,
    incidentId,
    provider: 'call-e',
    purpose: 'vendor_availability',
    authorizedContactId: 'CNS-4491',
    simulated: true,
    timeoutSeconds: 300,
    retries: 0,
    createdAt: new Date(createdAt)
  });
}
