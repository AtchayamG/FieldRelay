import { GetCallUsageUseCase, readPriorCallCount } from '../application/get-call-usage.use-case';
import { CallTask } from '../domain/call-task.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

function task(id: string, simulated: boolean): CallTask {
  return CallTask.create({
    id,
    displayId: `CALL-${id}`,
    incidentId: '11111111-1111-4111-8111-111111111111',
    provider: 'call-e',
    purpose: 'vendor_availability',
    authorizedContactId: 'CNS-4491',
    simulated,
    timeoutSeconds: 300,
    retries: 0,
    createdAt: new Date('2026-07-26T00:00:00.000Z')
  });
}

async function usageFor(tasks: CallTask[], placedElsewhere = 0, mode: 'demo' | 'live' = 'demo') {
  const database = new InMemoryDatabase();
  const transactions = new InMemoryTransactionManager(database);
  await transactions.withTransaction(async (uow) => {
    for (const entry of tasks) {
      await uow.calls.insert(entry);
    }
  });
  return new GetCallUsageUseCase(transactions, placedElsewhere, mode).execute();
}

describe('GetCallUsageUseCase', () => {
  it('reports zero when nothing has been called', async () => {
    await expect(usageFor([])).resolves.toMatchObject({
      placedByThisDeployment: 0,
      placedElsewhere: 0,
      totalLiveCallsPlaced: 0,
      mode: 'demo'
    });
  });

  it('counts only live calls, never simulated ones', async () => {
    // Simulated tasks reach no telephone and cost nothing, so counting them
    // would overstate real usage to a judge reading the figure.
    const usage = await usageFor([
      task('11111111-1111-4111-8111-000000000001', true),
      task('11111111-1111-4111-8111-000000000002', true),
      task('11111111-1111-4111-8111-000000000003', false)
    ]);

    expect(usage.placedByThisDeployment).toBe(1);
    expect(usage.totalLiveCallsPlaced).toBe(1);
  });

  it('adds calls made outside this deployment so the total is honest', async () => {
    // The CLI proof calls never touched this database, but they drew down the
    // same CALL-E account.
    const usage = await usageFor([task('11111111-1111-4111-8111-000000000004', false)], 3);

    expect(usage).toMatchObject({
      placedByThisDeployment: 1,
      placedElsewhere: 3,
      totalLiveCallsPlaced: 4
    });
  });

  it('reports the mode so the UI can say whether a call is even possible', async () => {
    await expect(usageFor([], 0, 'live')).resolves.toMatchObject({ mode: 'live' });
  });

  it('does not expose a remaining figure', async () => {
    // Deliberate: the published allowance is inconsistent between CALL-E's own
    // sources, there is no balance endpoint to reconcile against, and the
    // allowance can be topped up. A "remaining" number would be a guess shown
    // to judges as a fact.
    const usage = await usageFor([]);
    expect(Object.keys(usage)).toEqual([
      'placedByThisDeployment',
      'placedElsewhere',
      'totalLiveCallsPlaced',
      'mode'
    ]);
  });
});

describe('readPriorCallCount', () => {
  it('accepts a valid whole number', () => {
    expect(readPriorCallCount('3')).toBe(3);
    expect(readPriorCallCount(' 12 ')).toBe(12);
    expect(readPriorCallCount('0')).toBe(0);
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['negative', '-4'],
    ['fractional', '2.5'],
    ['non-numeric', 'many'],
    ['absurd', '999999999']
  ])('falls back to zero for a %s value', (_label, raw) => {
    expect(readPriorCallCount(raw)).toBe(0);
  });
});
