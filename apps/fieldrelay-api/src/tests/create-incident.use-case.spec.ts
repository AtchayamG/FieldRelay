import { CreateIncidentUseCase, CreateIncidentInput } from '../application/create-incident.use-case';
import { ListIncidentsUseCase } from '../application/list-incidents.use-case';
import { GetIncidentUseCase } from '../application/get-incident.use-case';
import {
  CallValidationError,
  IdempotencyConflictError,
  NotFoundError
} from '../application/errors';
import { IncidentInvariantError } from '../domain/incident.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

const validInput = (over: Partial<CreateIncidentInput> = {}): CreateIncidentInput => ({
  propertyId: 'PROP-001',
  unit: '4B',
  type: 'plumbing',
  priority: 'critical',
  description: 'Mixer valve failure in the main bathroom; water shut off at the riser.',
  reportedBy: 'Demo Property Manager',
  idempotencyKey: 'idemp_incident_1',
  correlationId: 'req_test_1',
  ...over
});

describe('CreateIncidentUseCase', () => {
  let db: InMemoryDatabase;
  let transactions: InMemoryTransactionManager;
  let useCase: CreateIncidentUseCase;

  beforeEach(() => {
    db = new InMemoryDatabase();
    transactions = new InMemoryTransactionManager(db);
    useCase = new CreateIncidentUseCase(transactions);
  });

  it('persists a new incident at the start of the lifecycle', async () => {
    const { incident, replayed } = await useCase.execute(validInput());

    expect(replayed).toBe(false);
    expect(incident.status).toBe('intake');
    expect(incident.version).toBe(1);
    expect(incident.displayId).toBe('INC-2042-0001');
    expect(incident.unit).toBe('4B');
    expect(db.incidents).toHaveLength(1);
    expect(db.incidents[0].id).toBe(incident.id);
  });

  it('writes exactly one audit event for the created incident', async () => {
    const { incident } = await useCase.execute(validInput());

    expect(db.auditEvents).toHaveLength(1);
    expect(db.auditEvents[0]).toMatchObject({
      action: 'incident.created',
      entityType: 'incident',
      entityId: incident.id,
      correlationId: 'req_test_1'
    });
    expect(db.auditEvents[0].metadata).toMatchObject({
      displayId: incident.displayId,
      status: 'intake'
    });
    expect(db.auditEvents[0].metadata).not.toHaveProperty('idempotencyKey');
    expect(db.auditEvents[0].metadata).not.toHaveProperty('reportedBy');
  });

  it('returns the same incident for a repeated key and equivalent request', async () => {
    const first = await useCase.execute(validInput());
    const second = await useCase.execute(validInput());

    expect(second.replayed).toBe(true);
    expect(second.incident.id).toBe(first.incident.id);
    expect(second.incident.displayId).toBe(first.incident.displayId);
    // No second incident and no second audit event.
    expect(db.incidents).toHaveLength(1);
    expect(db.auditEvents).toHaveLength(1);
  });

  it('treats an omitted unit and an explicit null unit as the same request', async () => {
    const first = await useCase.execute(validInput({ unit: undefined }));
    const second = await useCase.execute(validInput({ unit: undefined }));

    expect(second.replayed).toBe(true);
    expect(first.incident.unit).toBeNull();
  });

  it('rejects a repeated key whose request body differs', async () => {
    await useCase.execute(validInput());

    await expect(useCase.execute(validInput({ priority: 'low' }))).rejects.toBeInstanceOf(
      IdempotencyConflictError
    );
    expect(db.incidents).toHaveLength(1);
  });

  it('creates one incident when the same key arrives concurrently', async () => {
    const results = await Promise.all([
      useCase.execute(validInput()),
      useCase.execute(validInput()),
      useCase.execute(validInput())
    ]);

    const ids = new Set(results.map((r) => r.incident.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.replayed)).toHaveLength(2);
    expect(db.incidents).toHaveLength(1);
    expect(db.auditEvents).toHaveLength(1);
  });

  it('issues distinct incidents for distinct keys', async () => {
    const first = await useCase.execute(validInput({ idempotencyKey: 'idemp_a' }));
    const second = await useCase.execute(validInput({ idempotencyKey: 'idemp_b' }));

    expect(second.incident.id).not.toBe(first.incident.id);
    expect([first.incident.displayId, second.incident.displayId]).toEqual([
      'INC-2042-0001',
      'INC-2042-0002'
    ]);
  });

  const rejectionCases: Array<{ name: string; input: CreateIncidentInput; error: unknown }> = [
    { name: 'a missing idempotency key', input: validInput({ idempotencyKey: '' }), error: CallValidationError },
    { name: 'an oversized idempotency key', input: validInput({ idempotencyKey: 'k'.repeat(256) }), error: CallValidationError },
    { name: 'a non-ASCII idempotency key', input: validInput({ idempotencyKey: 'idemp key' }), error: CallValidationError },
    { name: 'an empty propertyId', input: validInput({ propertyId: '  ' }), error: IncidentInvariantError },
    { name: 'an empty description', input: validInput({ description: '' }), error: IncidentInvariantError },
    { name: 'an oversized description', input: validInput({ description: 'x'.repeat(2001) }), error: IncidentInvariantError },
    { name: 'an unknown type', input: validInput({ type: 'teleportation' as never }), error: IncidentInvariantError },
    { name: 'an unknown priority', input: validInput({ priority: 'urgent' as never }), error: IncidentInvariantError }
  ];

  it.each(rejectionCases)('rejects $name and persists nothing', async ({ input, error }) => {
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(db.incidents).toHaveLength(0);
    expect(db.auditEvents).toHaveLength(0);
  });

  it('frees the key when the request failed, so a corrected retry can use it', async () => {
    await expect(
      useCase.execute(validInput({ description: '' }))
    ).rejects.toBeInstanceOf(IncidentInvariantError);

    // The failed transaction rolled back, so the reservation never committed.
    const { incident } = await useCase.execute(validInput());
    expect(incident.description).not.toBe('');
    expect(db.incidents).toHaveLength(1);
  });
});

describe('GetIncidentUseCase', () => {
  let db: InMemoryDatabase;
  let create: CreateIncidentUseCase;
  let get: GetIncidentUseCase;

  beforeEach(() => {
    db = new InMemoryDatabase();
    const transactions = new InMemoryTransactionManager(db);
    create = new CreateIncidentUseCase(transactions);
    get = new GetIncidentUseCase(transactions);
  });

  it('returns a persisted incident by id', async () => {
    const { incident } = await create.execute(validInput());
    const found = await get.execute(incident.id);
    expect(found.displayId).toBe(incident.displayId);
  });

  it('rejects a non-UUID id before querying', async () => {
    await expect(get.execute('INC-2042-0001')).rejects.toBeInstanceOf(CallValidationError);
  });

  it('reports an unknown incident as not found', async () => {
    await expect(
      get.execute('11111111-1111-4111-8111-1111111119ff')
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ListIncidentsUseCase', () => {
  let db: InMemoryDatabase;
  let create: CreateIncidentUseCase;
  let list: ListIncidentsUseCase;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    const transactions = new InMemoryTransactionManager(db);
    create = new CreateIncidentUseCase(transactions);
    list = new ListIncidentsUseCase(transactions);

    for (let i = 0; i < 3; i += 1) {
      await create.execute(validInput({ idempotencyKey: `idemp_${i}` }));
    }
  });

  it('returns incidents newest first and exhausts the cursor', async () => {
    const first = await list.execute({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await list.execute({ limit: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    const ids = [...first.items, ...second.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('filters by lifecycle status', async () => {
    expect((await list.execute({ status: 'intake' })).items).toHaveLength(3);
    expect((await list.execute({ status: 'resolved' })).items).toHaveLength(0);
  });

  const invalidQueries = [
    { name: 'a zero limit', query: { limit: 0 } },
    { name: 'a limit above the maximum', query: { limit: 101 } },
    { name: 'a fractional limit', query: { limit: 2.5 } },
    { name: 'an unknown status', query: { status: 'exploded' } },
    { name: 'a malformed cursor', query: { cursor: '%%%' } }
  ];

  it.each(invalidQueries)('rejects $name', async ({ query }) => {
    await expect(list.execute(query)).rejects.toBeInstanceOf(CallValidationError);
  });
});
