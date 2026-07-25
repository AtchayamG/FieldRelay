import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  createPool,
  PgTransactionManager
} from '../infrastructure/persistence/pg/pg-unit-of-work';
import { Incident } from '../domain/incident.entity';
import { CallTask } from '../domain/call-task.entity';

// Exercises the real SQL. Opt-in: set DATABASE_URL (see docker-compose.yml and
// .env.example) to run it, otherwise it is skipped so the default test run
// needs no database.
//
//   docker compose up -d postgres
//   DATABASE_URL=postgresql://fieldrelay:fieldrelay_local_dev@127.0.0.1:5432/fieldrelay \
//     pnpm --filter fieldrelay-api test
const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase('PgTransactionManager (integration)', () => {
  // Namespaced per run so parallel runs and the seeded demo rows never collide.
  const propertyId = `TEST-${randomUUID().slice(0, 8)}`;
  let pool: Pool;
  let transactions: PgTransactionManager;

  const newIncident = (createdAt: Date): Incident =>
    Incident.create({
      id: randomUUID(),
      displayId: `INC-TEST-${randomUUID().slice(0, 8)}`,
      propertyId,
      unit: '4B',
      type: 'plumbing',
      priority: 'critical',
      description: 'Integration fixture incident.',
      reportedBy: 'Integration Test',
      createdAt
    });

  beforeAll(() => {
    pool = createPool();
    transactions = new PgTransactionManager(pool);
  });

  afterAll(async () => {
    // audit_events is append-only by trigger, so only the incidents and the
    // idempotency records this run created are removed.
    await pool.query(
      `DELETE FROM call_tasks
       WHERE incident_id IN (SELECT id FROM incidents WHERE property_id = $1)`,
      [propertyId]
    );
    await pool.query('DELETE FROM incidents WHERE property_id = $1', [propertyId]);
    await pool.query('DELETE FROM operation_idempotency WHERE idempotency_key LIKE $1', [
      `${propertyId}%`
    ]);
    await pool.end();
  });

  it('issues sequential fictional display identifiers', async () => {
    const [first, second] = await transactions.withTransaction(async (uow) => [
      await uow.incidents.nextDisplayId(),
      await uow.incidents.nextDisplayId()
    ]);

    expect(first).toMatch(/^INC-2042-\d{4,}$/);
    expect(Number(second.slice(-4))).toBe(Number(first.slice(-4)) + 1);
  });

  it('round-trips an incident through insert and findById', async () => {
    const incident = newIncident(new Date('2042-04-01T10:00:00.000Z'));
    await transactions.withTransaction((uow) => uow.incidents.insert(incident));

    const found = await transactions.withTransaction((uow) =>
      uow.incidents.findById(incident.id)
    );
    expect(found?.toProps()).toEqual(incident.toProps());
  });

  it('rolls back every write in a failed transaction', async () => {
    const incident = newIncident(new Date('2042-04-01T10:05:00.000Z'));

    await expect(
      transactions.withTransaction(async (uow) => {
        await uow.incidents.insert(incident);
        throw new Error('deliberate failure');
      })
    ).rejects.toThrow('deliberate failure');

    const found = await transactions.withTransaction((uow) =>
      uow.incidents.findById(incident.id)
    );
    expect(found).toBeNull();
  });

  it('pages newest-first through the keyset cursor', async () => {
    // A status no seeded row uses, so the filter isolates this fixture set.
    const created: Incident[] = [];
    for (let i = 0; i < 3; i += 1) {
      const incident = newIncident(new Date(Date.UTC(2042, 4, 1, 12, i)));
      incident.transitionTo('triage', incident.createdAt);
      incident.transitionTo('calling', incident.createdAt);
      created.push(incident);
    }
    await transactions.withTransaction(async (uow) => {
      for (const incident of created) await uow.incidents.insert(incident);
    });

    const first = await transactions.withTransaction((uow) =>
      uow.incidents.list({ limit: 2, status: 'calling' })
    );
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    // Newest first.
    expect(first.items[0].id).toBe(created[2].id);

    const second = await transactions.withTransaction((uow) =>
      uow.incidents.list({ limit: 2, status: 'calling', cursor: first.nextCursor ?? undefined })
    );
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).toBe(created[0].id);
    expect(second.nextCursor).toBeNull();
  });

  it('round-trips, updates and filters a durable call task', async () => {
    const incident = newIncident(new Date('2042-04-01T11:00:00.000Z'));
    const task = CallTask.create({
      id: randomUUID(),
      displayId: `CALL-TEST-${randomUUID().slice(0, 8)}`,
      incidentId: incident.id,
      provider: 'call-e',
      purpose: 'vendor_availability',
      authorizedContactId: 'CNS-4491',
      simulated: true,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date('2042-04-01T11:01:00.000Z')
    });
    await transactions.withTransaction(async (uow) => {
      await uow.incidents.insert(incident);
      await uow.calls.insert(task);
    });

    const queued = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
    expect(queued?.toProps()).toEqual(task.toProps());

    task.recordProviderResult({
      providerTaskId: 'demo_pg_task',
      status: 'completed',
      simulated: true,
      at: new Date('2042-04-01T11:02:00.000Z')
    });
    await transactions.withTransaction((uow) => uow.calls.update(task));

    const page = await transactions.withTransaction((uow) =>
      uow.calls.list({ limit: 10, incidentId: incident.id, status: 'completed' })
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0].toProps()).toEqual(task.toProps());
  });

  it('enforces the call-task incident foreign key', async () => {
    const orphan = CallTask.create({
      id: randomUUID(),
      displayId: `CALL-TEST-${randomUUID().slice(0, 8)}`,
      incidentId: randomUUID(),
      provider: 'call-e',
      purpose: 'status_update',
      authorizedContactId: 'CNS-4491',
      simulated: true,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date('2042-04-01T12:00:00.000Z')
    });

    await expect(
      transactions.withTransaction((uow) => uow.calls.insert(orphan))
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('appends an audit event that cannot then be rewritten', async () => {
    const entityId = randomUUID();
    await transactions.withTransaction((uow) =>
      uow.audit.append({
        actorType: 'system',
        actorId: 'integration-test',
        action: 'incident.created',
        entityType: 'incident',
        entityId,
        correlationId: `${propertyId}-audit`,
        metadata: { propertyId, seeded: false }
      })
    );

    const { rows } = await pool.query(
      'SELECT action, metadata FROM audit_events WHERE entity_id = $1',
      [entityId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toEqual({ propertyId, seeded: false });

    await expect(
      pool.query('UPDATE audit_events SET action = $1 WHERE entity_id = $2', ['tampered', entityId])
    ).rejects.toThrow(/append-only/);
  });

  describe('idempotency store', () => {
    it('reserves once, then reports the completed result', async () => {
      const key = `${propertyId}-complete`;
      const first = await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );
      expect(first).toEqual({ outcome: 'reserved' });

      const duringFlight = await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );
      expect(duringFlight).toEqual({ outcome: 'in_progress' });

      await transactions.withTransaction((uow) =>
        uow.idempotency.complete('call.start', key, { providerTaskId: 'demo_1' })
      );

      const replay = await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );
      expect(replay).toEqual({
        outcome: 'completed',
        result: { providerTaskId: 'demo_1' }
      });
    });

    it('reports a mismatch when the same key carries a different request', async () => {
      const key = `${propertyId}-mismatch`;
      await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );

      const mismatch = await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-b')
      );
      expect(mismatch).toEqual({ outcome: 'mismatch' });
    });

    it('refuses to complete a reservation it does not hold', async () => {
      const key = `${propertyId}-unheld`;
      await expect(
        transactions.withTransaction((uow) =>
          uow.idempotency.complete('call.start', key, { providerTaskId: 'demo_1' })
        )
      ).rejects.toThrow(/was not held/);
    });

    it('keeps a reservation claimed across separate transactions', async () => {
      // There is no release path by design: an unfinished reservation stays
      // claimed so an ambiguous provider outcome can never be re-dialled.
      const key = `${propertyId}-sticky`;
      await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );

      const again = await transactions.withTransaction((uow) =>
        uow.idempotency.reserve('call.start', key, 'hash-a')
      );
      expect(again).toEqual({ outcome: 'in_progress' });
    });

    it('grants the reservation to exactly one of several concurrent callers', async () => {
      const key = `${propertyId}-race`;
      const outcomes = await Promise.all(
        Array.from({ length: 8 }, () =>
          transactions.withTransaction((uow) =>
            uow.idempotency.reserve('call.start', key, 'hash-a')
          )
        )
      );

      expect(outcomes.filter((o) => o.outcome === 'reserved')).toHaveLength(1);
      expect(outcomes.filter((o) => o.outcome === 'in_progress')).toHaveLength(7);
    });

    it('creates a single incident when the same key commits concurrently', async () => {
      const key = `${propertyId}-incident-race`;
      const attempt = (): Promise<string | null> =>
        transactions.withTransaction(async (uow) => {
          const reservation = await uow.idempotency.reserve('incident.create', key, 'hash-a');
          if (reservation.outcome !== 'reserved') return null;

          const incident = newIncident(new Date('2042-04-02T09:00:00.000Z'));
          await uow.incidents.insert(incident);
          await uow.idempotency.complete('incident.create', key, { incidentId: incident.id });
          return incident.id;
        });

      const results = await Promise.all([attempt(), attempt(), attempt(), attempt()]);
      expect(results.filter((id) => id !== null)).toHaveLength(1);

      await pool.query('DELETE FROM operation_idempotency WHERE idempotency_key = $1', [key]);
    });

    it('persists operation_idempotency with call_task_id foreign key', async () => {
      const incident = newIncident(new Date('2042-04-01T12:00:00.000Z'));
      const task = CallTask.create({
        id: randomUUID(),
        displayId: `CALL-TEST-${randomUUID().slice(0, 8)}`,
        incidentId: incident.id,
        provider: 'call-e',
        purpose: 'vendor_availability',
        authorizedContactId: 'CNS-4491',
        simulated: true,
        timeoutSeconds: 300,
        retries: 0,
        createdAt: new Date('2042-04-01T12:01:00.000Z')
      });

      const key = `${propertyId}-fk-test`;
      await transactions.withTransaction(async (uow) => {
        await uow.incidents.insert(incident);
        await uow.calls.insert(task);
        await uow.idempotency.reserve('call.start', key, 'hash-fk', task.id);
      });

      const stale = await transactions.withTransaction((uow) =>
        uow.idempotency.findStaleReservations('call.start', new Date(), 10)
      );

      const match = stale.find((s) => s.key === key);
      expect(match).toBeDefined();
      expect(match?.callTaskId).toBe(task.id);
    });

    it('round-trips provider callbacks through PostgreSQL persistence', async () => {
      const eventId = `evt_pg_${randomUUID().slice(0, 8)}`;
      await transactions.withTransaction(async (uow) => {
        await uow.callbacks.insert({
          eventId,
          providerTaskId: 'pt_pg_1',
          status: 'connected',
          payloadHash: 'a'.repeat(64),
          processed: false,
          processingOutcome: null,
          receivedAt: new Date(),
          processedAt: null
        });
      });

      const found = await transactions.withTransaction((uow) =>
        uow.callbacks.findByEventId(eventId)
      );
      expect(found).toMatchObject({
        eventId,
        providerTaskId: 'pt_pg_1',
        status: 'connected',
        processed: false
      });

      await transactions.withTransaction((uow) =>
        uow.callbacks.updateProcessingOutcome(eventId, 'processed', new Date())
      );

      const updated = await transactions.withTransaction((uow) =>
        uow.callbacks.findByEventId(eventId)
      );
      expect(updated?.processed).toBe(true);
      expect(updated?.processingOutcome).toBe('processed');

      await pool.query('DELETE FROM provider_callbacks WHERE event_id = $1', [eventId]);
    });
  });
});
