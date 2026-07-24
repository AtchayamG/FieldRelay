import {
  decodeIncidentCursor,
  encodeIncidentCursor
} from '../../../application/incident-cursor';
import {
  AuditEventInput,
  AuditEventPort,
  IdempotencyReservation,
  IdempotencyStorePort,
  IdempotentOperation,
  IncidentPage,
  IncidentRepositoryPort,
  ListIncidentsQuery,
  TransactionPort,
  UnitOfWork
} from '../../../application/persistence.port';
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
  public readonly auditEvents: AuditEventInput[] = [];
  public readonly idempotency = new Map<string, StoredIdempotency>();
  public displaySequence = 0;
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
  public readonly audit: AuditEventPort;
  public readonly idempotency: IdempotencyStorePort;

  constructor(private readonly db: InMemoryDatabase) {
    const stage = (write: () => void): void => {
      this.pending.push(write);
    };
    this.incidents = new InMemoryIncidentRepository(db, stage);
    this.audit = new InMemoryAuditRepository(db, stage);
    this.idempotency = new InMemoryIdempotencyStore(db, stage);
  }

  public commit(): void {
    for (const write of this.pending) write();
    this.pending.length = 0;
  }
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
