import {
  decodeIncidentCursor,
  encodeIncidentCursor
} from '../../../application/incident-cursor';
import { decodeCallCursor, encodeCallCursor } from '../../../application/call-cursor';
import {
  AuditEventInput,
  AuditEventPort,
  CallTaskPage,
  CallTaskRepositoryPort,
  IdempotencyReservation,
  IdempotencyStorePort,
  IdempotentOperation,
  IncidentPage,
  IncidentRepositoryPort,
  ListCallTasksQuery,
  ListIncidentsQuery,
  TransactionPort,
  UnitOfWork
} from '../../../application/persistence.port';
import { CallTask } from '../../../domain/call-task.entity';
import { Incident } from '../../../domain/incident.entity';

// TEST-ONLY. This adapter is never wired into AppModule: deployment
// persistence is PostgreSQL from DATABASE_URL, and a volatile fallback would
// silently drop incidents, audit history and idempotency records on restart.
// It exists so use-case tests can exercise the transaction boundary without a
// database.

interface StoredIdempotency {
  requestHash: string;
  state: 'in_progress' | 'completed';
  result?: unknown;
}

export class InMemoryDatabase {
  public readonly incidents: Incident[] = [];
  public readonly callTasks: CallTask[] = [];
  public readonly auditEvents: AuditEventInput[] = [];
  public readonly idempotency = new Map<string, StoredIdempotency>();
  public displaySequence = 0;
  public callDisplaySequence = 0;
}

export class InMemoryTransactionManager implements TransactionPort {
  // Transactions run one at a time, mirroring the row lock that serializes
  // same-key callers in PostgreSQL. Without this the concurrency tests would
  // interleave in a way the real adapter never allows.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(public readonly db: InMemoryDatabase = new InMemoryDatabase()) {}

  public withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      // A rejected unit of work must not corrupt state that later ones read,
      // so writes are staged and published only on success.
      const staged = new StagedUnitOfWork(this.db);
      const result = await work(staged);
      staged.commit();
      return result;
    });
    // Keep the chain alive after a failure so the next transaction still runs.
    this.queue = run.catch(() => undefined);
    return run;
  }
}

class StagedUnitOfWork implements UnitOfWork {
  private readonly pending: Array<() => void> = [];

  public readonly incidents: IncidentRepositoryPort;
  public readonly calls: CallTaskRepositoryPort;
  public readonly audit: AuditEventPort;
  public readonly idempotency: IdempotencyStorePort;

  constructor(private readonly db: InMemoryDatabase) {
    const stage = (write: () => void): void => {
      this.pending.push(write);
    };
    this.incidents = new InMemoryIncidentRepository(db, stage);
    this.calls = new InMemoryCallTaskRepository(db, stage);
    this.audit = new InMemoryAuditRepository(db, stage);
    this.idempotency = new InMemoryIdempotencyStore(db, stage);
  }

  public commit(): void {
    for (const write of this.pending) write();
    this.pending.length = 0;
  }
}

class InMemoryCallTaskRepository implements CallTaskRepositoryPort {
  private readonly inserted: CallTask[] = [];
  private readonly updated = new Map<string, CallTask>();

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async nextDisplayId(): Promise<string> {
    this.db.callDisplaySequence += 1;
    return `CALL-2042-${String(this.db.callDisplaySequence).padStart(4, '0')}`;
  }

  public async insert(task: CallTask): Promise<void> {
    const stored = copyCallTask(task);
    this.inserted.push(stored);
    this.stage(() => this.db.callTasks.push(stored));
  }

  public async update(task: CallTask): Promise<void> {
    const stored = copyCallTask(task);
    this.updated.set(task.id, stored);
    this.stage(() => {
      const index = this.db.callTasks.findIndex((item) => item.id === task.id);
      if (index === -1) throw new Error(`Call task ${task.id} was not found`);
      this.db.callTasks[index] = stored;
    });
  }

  public async findById(id: string): Promise<CallTask | null> {
    return (
      this.updated.get(id) ??
      this.inserted.find((task) => task.id === id) ??
      this.db.callTasks.find((task) => task.id === id) ??
      null
    );
  }

  public async list(query: ListCallTasksQuery): Promise<CallTaskPage> {
    const byId = new Map(
      [...this.db.callTasks, ...this.inserted, ...this.updated.values()].map((task) => [
        task.id,
        task
      ])
    );
    let rows = [...byId.values()].sort(compareCallsDesc);
    if (query.status) rows = rows.filter((task) => task.status === query.status);
    if (query.incidentId) {
      rows = rows.filter((task) => task.incidentId === query.incidentId);
    }
    if (query.cursor) {
      const cursor = decodeCallCursor(query.cursor);
      rows = rows.filter(
        (task) =>
          task.createdAt.getTime() < cursor.createdAt.getTime() ||
          (task.createdAt.getTime() === cursor.createdAt.getTime() && task.id < cursor.id)
      );
    }

    const items = rows.slice(0, query.limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCallCursor({ createdAt: last.createdAt, id: last.id })
          : null
    };
  }
}

function compareCallsDesc(a: CallTask, b: CallTask): number {
  const byTime = b.createdAt.getTime() - a.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

function copyCallTask(task: CallTask): CallTask {
  return CallTask.rehydrate(task.toProps());
}

type Stage = (write: () => void) => void;

class InMemoryIncidentRepository implements IncidentRepositoryPort {
  private readonly staged: Incident[] = [];

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async nextDisplayId(): Promise<string> {
    this.db.displaySequence += 1;
    return `INC-2042-${String(this.db.displaySequence).padStart(4, '0')}`;
  }

  public async insert(incident: Incident): Promise<void> {
    this.staged.push(incident);
    this.stage(() => this.db.incidents.push(incident));
  }

  public async findById(id: string): Promise<Incident | null> {
    return (
      this.staged.find((i) => i.id === id) ?? this.db.incidents.find((i) => i.id === id) ?? null
    );
  }

  public async list(query: ListIncidentsQuery): Promise<IncidentPage> {
    let rows = [...this.db.incidents, ...this.staged].sort(compareIncidentsDesc);
    if (query.status) {
      rows = rows.filter((i) => i.status === query.status);
    }
    if (query.cursor) {
      const cursor = decodeIncidentCursor(query.cursor);
      rows = rows.filter(
        (i) =>
          i.createdAt.getTime() < cursor.createdAt.getTime() ||
          (i.createdAt.getTime() === cursor.createdAt.getTime() && i.id < cursor.id)
      );
    }

    const items = rows.slice(0, query.limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        rows.length > query.limit && last
          ? encodeIncidentCursor({ createdAt: last.createdAt, id: last.id })
          : null
    };
  }
}

function compareIncidentsDesc(a: Incident, b: Incident): number {
  const byTime = b.createdAt.getTime() - a.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

class InMemoryAuditRepository implements AuditEventPort {
  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async append(event: AuditEventInput): Promise<void> {
    // Frozen on the way in: the in-memory store must be as append-only as the
    // database trigger it stands in for.
    const frozen = Object.freeze({ ...event, metadata: Object.freeze({ ...event.metadata }) });
    this.stage(() => this.db.auditEvents.push(frozen));
  }
}

class InMemoryIdempotencyStore implements IdempotencyStorePort {
  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async reserve(
    operation: IdempotentOperation,
    key: string,
    requestHash: string
  ): Promise<IdempotencyReservation> {
    const id = `${operation}::${key}`;
    const existing = this.db.idempotency.get(id);
    if (!existing) {
      this.stage(() => this.db.idempotency.set(id, { requestHash, state: 'in_progress' }));
      return { outcome: 'reserved' };
    }
    if (existing.requestHash !== requestHash) {
      return { outcome: 'mismatch' };
    }
    return existing.state === 'completed'
      ? { outcome: 'completed', result: existing.result }
      : { outcome: 'in_progress' };
  }

  public async complete(
    operation: IdempotentOperation,
    key: string,
    result: unknown
  ): Promise<void> {
    const id = `${operation}::${key}`;
    this.stage(() => {
      const current = this.db.idempotency.get(id);
      if (!current || current.state !== 'in_progress') {
        throw new Error(`Idempotency reservation ${id} was not held when completing it`);
      }
      this.db.idempotency.set(id, { ...current, state: 'completed', result });
    });
  }

}
