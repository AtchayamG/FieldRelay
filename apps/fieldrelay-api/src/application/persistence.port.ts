import type { Incident, IncidentStatus } from '../domain/incident.entity';
import type { CallStatus, ProviderCallStatus, CallTask } from '../domain/call-task.entity';

export const TRANSACTION_PORT = Symbol('TRANSACTION_PORT');

// --- Incidents -------------------------------------------------------------

export interface IncidentPage {
  items: Incident[];
  nextCursor: string | null;
}

export interface ListIncidentsQuery {
  limit: number;
  cursor?: string;
  status?: IncidentStatus;
}

export interface IncidentRepositoryPort {
  // Allocates the next human-readable display identifier. Uniqueness is a
  // storage concern (a sequence), so it is issued here rather than guessed.
  nextDisplayId(): Promise<string>;
  insert(incident: Incident): Promise<void>;
  findById(id: string): Promise<Incident | null>;
  list(query: ListIncidentsQuery): Promise<IncidentPage>;
}

// --- Calls -----------------------------------------------------------------

export interface CallTaskPage {
  items: CallTask[];
  nextCursor: string | null;
}

export interface ListCallTasksQuery {
  limit: number;
  cursor?: string;
  status?: CallStatus;
  incidentId?: string;
}

export interface CallTaskRepositoryPort {
  nextDisplayId(): Promise<string>;
  insert(task: CallTask): Promise<void>;
  update(task: CallTask): Promise<void>;
  findById(id: string): Promise<CallTask | null>;
  findByProviderTaskId(providerTaskId: string): Promise<CallTask | null>;
  list(query: ListCallTasksQuery): Promise<CallTaskPage>;
  // Number of call tasks that were placed against a live provider. Simulated
  // tasks are excluded because they cost nothing and reach no telephone.
  countLiveCalls(): Promise<number>;
}

// --- Provider Callbacks ---------------------------------------------------

export interface ProviderCallbackRecord {
  eventId: string;
  providerTaskId: string;
  status: ProviderCallStatus;
  payloadHash: string;
  processed: boolean;
  processingOutcome: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}

export interface ProviderCallbackRepositoryPort {
  insert(record: ProviderCallbackRecord): Promise<void>;
  findByEventId(eventId: string): Promise<ProviderCallbackRecord | null>;
  updateProcessingOutcome(eventId: string, outcome: string, processedAt: Date): Promise<void>;
}

// --- Audit -----------------------------------------------------------------

export interface AuditEventInput {
  actorType: 'user' | 'system' | 'agent';
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}

// Append-only by contract and by database trigger. There is no update or
// delete on this port by design (blueprint doc 08).
export interface AuditEventPort {
  append(event: AuditEventInput): Promise<void>;
}

// --- Idempotency -----------------------------------------------------------

export type IdempotentOperation = 'incident.create' | 'call.start';

export type IdempotencyReservation =
  // First caller for this key: it owns the operation and must finish it.
  | { outcome: 'reserved' }
  // Another caller holds the reservation and has not finished yet.
  | { outcome: 'in_progress' }
  // The operation already finished; `result` is the recorded response.
  | { outcome: 'completed'; result: unknown }
  // The key was reused with a different request body.
  | { outcome: 'mismatch' };

export interface StaleReservationRecord {
  operation: IdempotentOperation;
  key: string;
  requestHash: string;
  callTaskId: string | null;
  createdAt: Date;
}

export interface IdempotencyStorePort {
  // Must be atomic and race-aware: concurrent callers with the same key are
  // serialized, and exactly one receives `reserved`.
  reserve(
    operation: IdempotentOperation,
    key: string,
    requestHash: string,
    callTaskId?: string
  ): Promise<IdempotencyReservation>;
  complete(operation: IdempotentOperation, key: string, result: unknown): Promise<void>;
  findStaleReservations(
    operation: IdempotentOperation,
    cutoff: Date,
    limit: number
  ): Promise<StaleReservationRecord[]>;
}

// --- Unit of work ----------------------------------------------------------

export interface UnitOfWork {
  incidents: IncidentRepositoryPort;
  calls: CallTaskRepositoryPort;
  callbacks: ProviderCallbackRepositoryPort;
  audit: AuditEventPort;
  idempotency: IdempotencyStorePort;
}

// One transactional boundary for the whole write path. Incident row, audit
// event and idempotency record must commit or roll back together.
export interface TransactionPort {
  withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
