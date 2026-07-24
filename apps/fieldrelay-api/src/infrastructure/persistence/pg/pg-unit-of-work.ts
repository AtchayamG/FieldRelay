import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
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
  // TLS is configured through the connection string (`?sslmode=require`) so
  // certificate verification is never silently weakened in code.
  return new Pool({ connectionString });
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
      // 2042 marks the identifier as fictional demo data; the sequence keeps it
      // unique without a read-modify-write in application code.
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
      // Row-value comparison matches the (created_at DESC, id DESC) index. The
      // casts are explicit so parameter types never depend on inference.
      conditions.push(
        `(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`
      );
    }

    // Fetch one extra row to learn whether a further page exists without a
    // second count query.
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
    requestHash: string
  ): Promise<IdempotencyReservation> {
    // Two statements rather than one upsert, so "did I insert it?" is answered
    // by whether a row came back instead of by inspecting system columns.
    //
    // ON CONFLICT DO NOTHING waits for a concurrent uncommitted insert of the
    // same key before deciding, and inserts if that transaction rolled back.
    const inserted = await this.client.query(
      `INSERT INTO operation_idempotency (operation, idempotency_key, request_hash, state)
       VALUES ($1, $2, $3, 'in_progress')
       ON CONFLICT (operation, idempotency_key) DO NOTHING
       RETURNING 1`,
      [operation, key, requestHash]
    );
    if (inserted.rowCount === 1) {
      return { outcome: 'reserved' };
    }

    // A row already exists. FOR UPDATE serializes us behind whoever holds it,
    // so by the time this returns the winner's outcome is committed and final.
    const { rows } = await this.client.query<IdempotencyRow>(
      `SELECT request_hash, state, result FROM operation_idempotency
       WHERE operation = $1 AND idempotency_key = $2
       FOR UPDATE`,
      [operation, key]
    );
    const existing = rows[0];
    if (!existing) {
      // The row vanished between the two statements — only a reaper clearing
      // an abandoned reservation does that. Report it as still in flight
      // rather than racing to claim it and risk a duplicate call.
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

}
