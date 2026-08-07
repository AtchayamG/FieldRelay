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
  ProviderCallbackRecord,
  ProviderCallbackRepositoryPort,
  StaleReservationRecord,
  TransactionPort,
  UnitOfWork
} from '../../../application/persistence.port';
import type { CallOutcome, CallOutcomeRepositoryPort } from '../../../application/call-outcome';
import type {
  ApprovalPage,
  ApprovalRepositoryPort,
  ListApprovalsQuery
} from '../../../application/approval.port';
import type {
  DispatchPage,
  DispatchRepositoryPort,
  ListDispatchesQuery
} from '../../../application/dispatch.port';
import { Approval } from '../../../domain/approval.entity';
import { Dispatch } from '../../../domain/dispatch.entity';
import { CallTask } from '../../../domain/call-task.entity';
import { Incident } from '../../../domain/incident.entity';

// TEST-ONLY. This adapter is never wired into AppModule: deployment
// persistence is PostgreSQL from DATABASE_URL, and a volatile fallback would
// silently drop incidents, audit history and idempotency records on restart.
// It exists so use-case tests can exercise the transaction boundary without a
// database.

interface StoredIdempotency {
  operation: IdempotentOperation;
  key: string;
  requestHash: string;
  state: 'in_progress' | 'completed';
  callTaskId: string | null;
  result?: unknown;
  createdAt: Date;
}

export class InMemoryDatabase {
  public readonly incidents: Incident[] = [];
  public readonly callTasks: CallTask[] = [];
  public readonly callbacks: ProviderCallbackRecord[] = [];
  public readonly outcomes = new Map<string, CallOutcome>();
  public readonly approvals: Approval[] = [];
  public approvalDisplaySequence = 0;
  public readonly dispatches: Dispatch[] = [];
  public dispatchDisplaySequence = 0;
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
  public readonly callbacks: ProviderCallbackRepositoryPort;
  public readonly outcomes: CallOutcomeRepositoryPort;
  public readonly approvals: ApprovalRepositoryPort;
  public readonly dispatches: DispatchRepositoryPort;
  public readonly audit: AuditEventPort;
  public readonly idempotency: IdempotencyStorePort;

  constructor(private readonly db: InMemoryDatabase) {
    const stage = (write: () => void): void => {
      this.pending.push(write);
    };
    this.incidents = new InMemoryIncidentRepository(db, stage);
    this.calls = new InMemoryCallTaskRepository(db, stage);
    this.callbacks = new InMemoryProviderCallbackRepository(db, stage);
    this.outcomes = new InMemoryCallOutcomeRepository(db, stage);
    this.approvals = new InMemoryApprovalRepository(db, stage);
    this.dispatches = new InMemoryDispatchRepository(db, stage);
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

  public async findByProviderTaskId(providerTaskId: string): Promise<CallTask | null> {
    const all = [...this.db.callTasks, ...this.inserted, ...this.updated.values()];
    const matches = all.filter((task) => task.providerTaskId === providerTaskId);
    if (matches.length === 0) return null;
    // Return the latest version/updated
    return matches.reduce((prev, curr) => (curr.version > prev.version ? curr : prev));
  }

  public async countLiveCalls(): Promise<number> {
    const byId = new Map(
      [...this.db.callTasks, ...this.inserted, ...this.updated.values()].map((task) => [
        task.id,
        task
      ])
    );
    return [...byId.values()].filter((task) => !task.simulated).length;
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

class InMemoryApprovalRepository implements ApprovalRepositoryPort {
  private readonly inserted: Approval[] = [];
  private readonly updated = new Map<string, Approval>();

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  private all(): Approval[] {
    const byId = new Map(
      [...this.db.approvals, ...this.inserted, ...this.updated.values()].map((a) => [a.id, a])
    );
    return [...byId.values()];
  }

  public async nextDisplayId(): Promise<string> {
    this.db.approvalDisplaySequence += 1;
    return `APP-2042-${String(this.db.approvalDisplaySequence).padStart(4, '0')}`;
  }

  public async insert(approval: Approval): Promise<void> {
    this.inserted.push(approval);
    this.stage(() => this.db.approvals.push(approval));
  }

  public async update(approval: Approval): Promise<void> {
    this.updated.set(approval.id, approval);
    this.stage(() => {
      const index = this.db.approvals.findIndex((a) => a.id === approval.id);
      if (index >= 0) {
        this.db.approvals[index] = approval;
      } else {
        this.db.approvals.push(approval);
      }
    });
  }

  public async findById(id: string): Promise<Approval | null> {
    return this.all().find((a) => a.id === id) ?? null;
  }

  public async findByCallTaskId(callTaskId: string): Promise<Approval | null> {
    return this.all().find((a) => a.callTaskId === callTaskId) ?? null;
  }

  public async countPending(): Promise<number> {
    return this.all().filter((a) => a.status === 'pending').length;
  }

  public async list(query: ListApprovalsQuery): Promise<ApprovalPage> {
    let rows = this.all().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (query.status) {
      rows = rows.filter((a) => a.status === query.status);
    }
    if (query.incidentId) {
      rows = rows.filter((a) => a.incidentId === query.incidentId);
    }
    const offset = query.cursor ? Number(Buffer.from(query.cursor, 'base64url').toString()) : 0;
    const page = rows.slice(offset, offset + query.limit);
    const nextOffset = offset + page.length;
    return {
      items: page,
      nextCursor:
        nextOffset < rows.length
          ? Buffer.from(String(nextOffset)).toString('base64url')
          : null
    };
  }
}

class InMemoryDispatchRepository implements DispatchRepositoryPort {
  private readonly inserted: Dispatch[] = [];
  private readonly updated = new Map<string, Dispatch>();

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  private all(): Dispatch[] {
    const byId = new Map(
      [...this.db.dispatches, ...this.inserted, ...this.updated.values()].map((d) => [d.id, d])
    );
    return [...byId.values()];
  }

  public async nextDisplayId(): Promise<string> {
    this.db.dispatchDisplaySequence += 1;
    return `DSP-2042-${String(this.db.dispatchDisplaySequence).padStart(4, '0')}`;
  }

  public async insert(dispatch: Dispatch): Promise<void> {
    this.inserted.push(dispatch);
    this.stage(() => this.db.dispatches.push(dispatch));
  }

  public async update(dispatch: Dispatch): Promise<void> {
    this.updated.set(dispatch.id, dispatch);
    this.stage(() => {
      const index = this.db.dispatches.findIndex((d) => d.id === dispatch.id);
      if (index >= 0) {
        this.db.dispatches[index] = dispatch;
      } else {
        this.db.dispatches.push(dispatch);
      }
    });
  }

  public async findById(id: string): Promise<Dispatch | null> {
    return this.all().find((d) => d.id === id) ?? null;
  }

  // Mirrors the UNIQUE constraint on approval_id. Both exist: the constraint is
  // the guarantee, this is what turns a repeat release into a no-op instead of
  // a database error the user has to read.
  public async findByApprovalId(approvalId: string): Promise<Dispatch | null> {
    return this.all().find((d) => d.approvalId === approvalId) ?? null;
  }

  public async countActive(): Promise<number> {
    return this.all().filter((d) => d.status !== 'completed' && d.status !== 'cancelled').length;
  }

  public async list(query: ListDispatchesQuery): Promise<DispatchPage> {
    let rows = this.all().sort((a, b) => b.dispatchedAt.getTime() - a.dispatchedAt.getTime());
    if (query.status) {
      rows = rows.filter((d) => d.status === query.status);
    }
    if (query.incidentId) {
      rows = rows.filter((d) => d.incidentId === query.incidentId);
    }
    const offset = query.cursor ? Number(Buffer.from(query.cursor, 'base64url').toString()) : 0;
    const page = rows.slice(offset, offset + query.limit);
    const nextOffset = offset + page.length;
    return {
      items: page,
      nextCursor:
        nextOffset < rows.length ? Buffer.from(String(nextOffset)).toString('base64url') : null
    };
  }
}

class InMemoryCallOutcomeRepository implements CallOutcomeRepositoryPort {
  private readonly staged = new Map<string, CallOutcome>();

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async upsert(outcome: CallOutcome): Promise<void> {
    this.staged.set(outcome.callTaskId, { ...outcome });
    this.stage(() => {
      for (const [key, value] of this.staged) {
        this.db.outcomes.set(key, value);
      }
    });
  }

  public async findByCallTaskId(callTaskId: string): Promise<CallOutcome | null> {
    // Staged writes are visible inside the same transaction, matching the
    // read-your-own-writes behaviour of the PostgreSQL implementation.
    return this.staged.get(callTaskId) ?? this.db.outcomes.get(callTaskId) ?? null;
  }
}

class InMemoryProviderCallbackRepository implements ProviderCallbackRepositoryPort {
  private readonly staged: ProviderCallbackRecord[] = [];

  constructor(
    private readonly db: InMemoryDatabase,
    private readonly stage: Stage
  ) {}

  public async insert(record: ProviderCallbackRecord): Promise<void> {
    const copy = { ...record };
    this.staged.push(copy);
    this.stage(() => this.db.callbacks.push(copy));
  }

  public async findByEventId(eventId: string): Promise<ProviderCallbackRecord | null> {
    return (
      this.staged.find((c) => c.eventId === eventId) ??
      this.db.callbacks.find((c) => c.eventId === eventId) ??
      null
    );
  }

  public async updateProcessingOutcome(
    eventId: string,
    outcome: string,
    processedAt: Date
  ): Promise<void> {
    this.stage(() => {
      const callback = this.db.callbacks.find((c) => c.eventId === eventId);
      if (callback) {
        callback.processed = true;
        callback.processingOutcome = outcome;
        callback.processedAt = processedAt;
      }
    });
  }
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
    requestHash: string,
    callTaskId?: string
  ): Promise<IdempotencyReservation> {
    const id = `${operation}::${key}`;
    const existing = this.db.idempotency.get(id);
    if (!existing) {
      this.stage(() =>
        this.db.idempotency.set(id, {
          operation,
          key,
          requestHash,
          state: 'in_progress',
          callTaskId: callTaskId ?? null,
          createdAt: new Date()
        })
      );
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

  public async findStaleReservations(
    operation: IdempotentOperation,
    cutoff: Date,
    limit: number
  ): Promise<StaleReservationRecord[]> {
    const matching: StaleReservationRecord[] = [];
    for (const record of this.db.idempotency.values()) {
      if (
        record.operation === operation &&
        record.state === 'in_progress' &&
        record.createdAt.getTime() < cutoff.getTime()
      ) {
        matching.push({
          operation: record.operation,
          key: record.key,
          requestHash: record.requestHash,
          callTaskId: record.callTaskId,
          createdAt: record.createdAt
        });
      }
    }
    matching.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return matching.slice(0, limit);
  }
}
