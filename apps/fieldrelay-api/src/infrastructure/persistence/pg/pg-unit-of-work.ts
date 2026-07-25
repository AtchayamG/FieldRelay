import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
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
import {
  CallFailureCode,
  CallPurpose,
  CallStatus,
  ProviderCallStatus,
  CallTask
} from '../../../domain/call-task.entity';
import {
  Incident,
  IncidentPriority,
  IncidentStatus,
  IncidentType
} from '../../../domain/incident.entity';

// Reads DATABASE_URL and fails loudly when it is absent. Deployment persistence
// is PostgreSQL: there is deliberately no in-memory fallback here, because a
// silent fallback would lose incidents and idempotency records on restart.
export function createPool(env: NodeJS.ProcessEnv = process.env): Pool {
  const connectionString = env.DATABASE_URL;
  if (!connectionString || connectionString.trim().length === 0) {
    throw new Error(
      'DATABASE_URL is required. FieldRelay persists incidents, audit events and ' +
        'idempotency records in PostgreSQL and will not start without it.'
    );
  }
  // On a serverless platform every concurrent invocation is its own process
  // with its own pool, so the default pool size multiplies by the number of
  // live functions and exhausts the database's connection limit. PGPOOL_MAX
  // lets that deployment pin one connection per invocation, and a pooling
  // endpoint (PgBouncer, Neon's -pooler host) does the real multiplexing.
  const rawMax = Number(env.PGPOOL_MAX ?? '10');
  const max = Number.isInteger(rawMax) && rawMax > 0 && rawMax <= 50 ? rawMax : 10;

  // TLS is configured through the connection string (`?sslmode=require`) so
  // certificate verification is never silently weakened in code.
  return new Pool({
    connectionString,
    max,
    // A serverless invocation is frozen between requests, so an idle socket is
    // usually already dead by the next one. Recycling quickly avoids handing
    // out a connection the platform has silently closed.
    idleTimeoutMillis: Number(env.PGPOOL_IDLE_MS ?? '10000'),
    connectionTimeoutMillis: Number(env.PGPOOL_CONNECT_MS ?? '10000')
  });
}

// Owns the pool's lifetime so Nest closes it on shutdown instead of leaving
// sockets open.
@Injectable()
export class PgPoolProvider implements OnApplicationShutdown {
  public readonly pool: Pool = createPool();

  public async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export class PgTransactionManager implements TransactionPort {
  constructor(private readonly pool: Pool) {}

  public async withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work({
        incidents: new PgIncidentRepository(client),
        calls: new PgCallTaskRepository(client),
        callbacks: new PgProviderCallbackRepository(client),
        audit: new PgAuditEventRepository(client),
        idempotency: new PgIdempotencyStore(client)
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

interface CallTaskRow {
  id: string;
  display_id: string;
  incident_id: string;
  provider: string;
  provider_task_id: string | null;
  purpose: string;
  authorized_contact_id: string;
  status: string;
  simulated: boolean;
  failure_code: string | null;
  timeout_seconds: number;
  retries: number;
  created_at: Date;
  updated_at: Date;
  version: number;
}

const CALL_TASK_COLUMNS = `id, display_id, incident_id, provider, provider_task_id,
       purpose, authorized_contact_id, status, simulated, failure_code,
       timeout_seconds, retries, created_at, updated_at, version`;

function toCallTask(row: CallTaskRow): CallTask {
  return CallTask.rehydrate({
    id: row.id,
    displayId: row.display_id,
    incidentId: row.incident_id,
    provider: row.provider,
    providerTaskId: row.provider_task_id,
    purpose: row.purpose as CallPurpose,
    authorizedContactId: row.authorized_contact_id,
    status: row.status as CallStatus,
    simulated: row.simulated,
    failureCode: row.failure_code as CallFailureCode | null,
    timeoutSeconds: row.timeout_seconds,
    retries: row.retries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version
  });
}

class PgCallTaskRepository implements CallTaskRepositoryPort {
  constructor(private readonly client: PoolClient) {}

  public async nextDisplayId(): Promise<string> {
    const { rows } = await this.client.query<{ display_id: string }>(
      `SELECT 'CALL-2042-' || lpad(nextval('call_task_display_seq')::text, 4, '0') AS display_id`
    );
    return rows[0].display_id;
  }

  public async insert(task: CallTask): Promise<void> {
    const props = task.toProps();
    await this.client.query(
      `INSERT INTO call_tasks (${CALL_TASK_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        props.id,
        props.displayId,
        props.incidentId,
        props.provider,
        props.providerTaskId,
        props.purpose,
        props.authorizedContactId,
        props.status,
        props.simulated,
        props.failureCode,
        props.timeoutSeconds,
        props.retries,
        props.createdAt,
        props.updatedAt,
        props.version
      ]
    );
  }

  public async update(task: CallTask): Promise<void> {
    const props = task.toProps();
    const updated = await this.client.query(
      `UPDATE call_tasks
          SET provider_task_id = $2, status = $3, simulated = $4, failure_code = $5,
              updated_at = $6, version = $7
        WHERE id = $1 AND version = $8`,
      [
        props.id,
        props.providerTaskId,
        props.status,
        props.simulated,
        props.failureCode,
        props.updatedAt,
        props.version,
        props.version - 1
      ]
    );
    if (updated.rowCount !== 1) {
      throw new Error(`Call task ${props.id} was concurrently modified or not found`);
    }
  }

  public async findById(id: string): Promise<CallTask | null> {
    const { rows } = await this.client.query<CallTaskRow>(
      `SELECT ${CALL_TASK_COLUMNS} FROM call_tasks WHERE id = $1`,
      [id]
    );
    return rows.length > 0 ? toCallTask(rows[0]) : null;
  }

  public async findByProviderTaskId(providerTaskId: string): Promise<CallTask | null> {
    const { rows } = await this.client.query<CallTaskRow>(
      `SELECT ${CALL_TASK_COLUMNS} FROM call_tasks
       WHERE provider_task_id = $1
       ORDER BY updated_at DESC, version DESC
       LIMIT 1`,
      [providerTaskId]
    );
    return rows.length > 0 ? toCallTask(rows[0]) : null;
  }

  public async list(query: ListCallTasksQuery): Promise<CallTaskPage> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }
    if (query.incidentId) {
      params.push(query.incidentId);
      conditions.push(`incident_id = $${params.length}::uuid`);
    }
    if (query.cursor) {
      const cursor = decodeCallCursor(query.cursor);
      params.push(cursor.createdAt, cursor.id);
      conditions.push(
        `(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`
      );
    }
    params.push(query.limit + 1);
    const { rows } = await this.client.query<CallTaskRow>(
      `SELECT ${CALL_TASK_COLUMNS} FROM call_tasks
       ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params
    );
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(toCallTask);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last ? encodeCallCursor({ createdAt: last.createdAt, id: last.id }) : null
    };
  }
}

interface ProviderCallbackRow {
  event_id: string;
  provider_task_id: string;
  status: string;
  payload_hash: string;
  processed: boolean;
  processing_outcome: string | null;
  received_at: Date;
  processed_at: Date | null;
}

class PgProviderCallbackRepository implements ProviderCallbackRepositoryPort {
  constructor(private readonly client: PoolClient) {}

  public async insert(record: ProviderCallbackRecord): Promise<void> {
    await this.client.query(
      `INSERT INTO provider_callbacks
         (event_id, provider_task_id, status, payload_hash, processed, processing_outcome, received_at, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.eventId,
        record.providerTaskId,
        record.status,
        record.payloadHash,
        record.processed,
        record.processingOutcome,
        record.receivedAt,
        record.processedAt
      ]
    );
  }

  public async findByEventId(eventId: string): Promise<ProviderCallbackRecord | null> {
    const { rows } = await this.client.query<ProviderCallbackRow>(
      `SELECT event_id, provider_task_id, status, payload_hash, processed, processing_outcome, received_at, processed_at
       FROM provider_callbacks WHERE event_id = $1`,
      [eventId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      eventId: row.event_id,
      providerTaskId: row.provider_task_id,
      status: row.status as ProviderCallStatus,
      payloadHash: row.payload_hash,
      processed: row.processed,
      processingOutcome: row.processing_outcome,
      receivedAt: row.received_at,
      processedAt: row.processed_at
    };
  }

  public async updateProcessingOutcome(
    eventId: string,
    outcome: string,
    processedAt: Date
  ): Promise<void> {
    await this.client.query(
      `UPDATE provider_callbacks
          SET processed = true, processing_outcome = $2, processed_at = $3
        WHERE event_id = $1`,
      [eventId, outcome, processedAt]
    );
  }
}

// --- Repositories ----------------------------------------------------------

interface IncidentRow {
  id: string;
  display_id: string;
  property_id: string;
  unit: string | null;
  type: string;
  priority: string;
  status: string;
  description: string;
  reported_by: string;
  created_at: Date;
  updated_at: Date;
  version: number;
}

const INCIDENT_COLUMNS = `id, display_id, property_id, unit, type, priority, status,
       description, reported_by, created_at, updated_at, version`;

function toIncident(row: IncidentRow): Incident {
  return Incident.rehydrate({
    id: row.id,
    displayId: row.display_id,
    propertyId: row.property_id,
    unit: row.unit,
    type: row.type as IncidentType,
    priority: row.priority as IncidentPriority,
    status: row.status as IncidentStatus,
    description: row.description,
    reportedBy: row.reported_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version
  });
}

class PgIncidentRepository implements IncidentRepositoryPort {
  constructor(private readonly client: PoolClient) {}

  public async nextDisplayId(): Promise<string> {
    const { rows } = await this.client.query<{ display_id: string }>(
      `SELECT 'INC-2042-' || lpad(nextval('incident_display_seq')::text, 4, '0') AS display_id`
    );
    return rows[0].display_id;
  }

  public async insert(incident: Incident): Promise<void> {
    const props = incident.toProps();
    await this.client.query(
      `INSERT INTO incidents (${INCIDENT_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        props.id,
        props.displayId,
        props.propertyId,
        props.unit,
        props.type,
        props.priority,
        props.status,
        props.description,
        props.reportedBy,
        props.createdAt,
        props.updatedAt,
        props.version
      ]
    );
  }

  public async findById(id: string): Promise<Incident | null> {
    const { rows } = await this.client.query<IncidentRow>(
      `SELECT ${INCIDENT_COLUMNS} FROM incidents WHERE id = $1`,
      [id]
    );
    return rows.length > 0 ? toIncident(rows[0]) : null;
  }

  public async list(query: ListIncidentsQuery): Promise<IncidentPage> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }
    if (query.cursor) {
      const cursor = decodeIncidentCursor(query.cursor);
      params.push(cursor.createdAt, cursor.id);
      conditions.push(
        `(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`
      );
    }

    params.push(query.limit + 1);
    const { rows } = await this.client.query<IncidentRow>(
      `SELECT ${INCIDENT_COLUMNS} FROM incidents
       ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params
    );

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(toIncident);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last ? encodeIncidentCursor({ createdAt: last.createdAt, id: last.id }) : null
    };
  }
}

class PgAuditEventRepository implements AuditEventPort {
  constructor(private readonly client: PoolClient) {}

  public async append(event: AuditEventInput): Promise<void> {
    await this.client.query(
      `INSERT INTO audit_events
         (actor_type, actor_id, action, entity_type, entity_id, correlation_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        event.actorType,
        event.actorId,
        event.action,
        event.entityType,
        event.entityId,
        event.correlationId,
        JSON.stringify(event.metadata)
      ]
    );
  }
}

interface IdempotencyRow {
  request_hash: string;
  state: 'in_progress' | 'completed';
  result: unknown;
}

class PgIdempotencyStore implements IdempotencyStorePort {
  constructor(private readonly client: PoolClient) {}

  public async reserve(
    operation: IdempotentOperation,
    key: string,
    requestHash: string,
    callTaskId?: string
  ): Promise<IdempotencyReservation> {
    const inserted = await this.client.query(
      `INSERT INTO operation_idempotency (operation, idempotency_key, request_hash, state, call_task_id)
       VALUES ($1, $2, $3, 'in_progress', $4)
       ON CONFLICT (operation, idempotency_key) DO NOTHING
       RETURNING 1`,
      [operation, key, requestHash, callTaskId ?? null]
    );
    if (inserted.rowCount === 1) {
      return { outcome: 'reserved' };
    }

    const { rows } = await this.client.query<IdempotencyRow>(
      `SELECT request_hash, state, result FROM operation_idempotency
       WHERE operation = $1 AND idempotency_key = $2
       FOR UPDATE`,
      [operation, key]
    );
    const existing = rows[0];
    if (!existing) {
      return { outcome: 'in_progress' };
    }
    if (existing.request_hash !== requestHash) {
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
    const updated = await this.client.query(
      `UPDATE operation_idempotency
          SET state = 'completed', result = $3::jsonb, completed_at = now()
        WHERE operation = $1 AND idempotency_key = $2 AND state = 'in_progress'`,
      [operation, key, JSON.stringify(result)]
    );
    if (updated.rowCount !== 1) {
      throw new Error(
        `Idempotency reservation ${operation}/${key} was not held when completing it`
      );
    }
  }

  public async findStaleReservations(
    operation: IdempotentOperation,
    cutoff: Date,
    limit: number
  ): Promise<StaleReservationRecord[]> {
    interface StaleRow {
      operation: string;
      idempotency_key: string;
      request_hash: string;
      call_task_id: string | null;
      created_at: Date;
    }
    const { rows } = await this.client.query<StaleRow>(
      `SELECT operation, idempotency_key, request_hash, call_task_id, created_at
       FROM operation_idempotency
       WHERE operation = $1 AND state = 'in_progress' AND created_at < $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [operation, cutoff, limit]
    );
    return rows.map((r) => ({
      operation: r.operation as IdempotentOperation,
      key: r.idempotency_key,
      requestHash: r.request_hash,
      callTaskId: r.call_task_id,
      createdAt: r.created_at
    }));
  }
}
