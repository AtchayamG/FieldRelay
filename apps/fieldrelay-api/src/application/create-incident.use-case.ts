import { randomUUID } from 'node:crypto';
import { Incident, IncidentPriority, IncidentType } from '../domain/incident.entity';
import { IdempotencyConflictError, OperationInProgressError } from './errors';
import { TransactionPort } from './persistence.port';
import { hashRequest, requireIdempotencyKey } from './request-hash';

export interface CreateIncidentInput {
  propertyId: string;
  unit?: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  reportedBy: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface CreateIncidentOutput {
  incident: Incident;
  // true when this request replayed an earlier one with the same key.
  replayed: boolean;
}

// Recorded against the idempotency key. Only the identifier is stored: the
// incident row stays the single source of truth for its own contents.
interface CreateIncidentRecord {
  incidentId: string;
}

// Plain class — no Nest decorators. The module wires dependencies by factory.
export class CreateIncidentUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: CreateIncidentInput): Promise<CreateIncidentOutput> {
    const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);

    // Hash the request body only. The correlation id changes per HTTP request
    // and must not make an otherwise identical retry look like a new request.
    const requestHash = hashRequest({
      propertyId: input.propertyId,
      unit: input.unit ?? null,
      type: input.type,
      priority: input.priority,
      description: input.description,
      reportedBy: input.reportedBy
    });

    // One transaction: the reservation, the incident row and the audit event
    // commit together or not at all. The reservation takes a row lock, so a
    // concurrent request with the same key waits here and then observes the
    // committed result instead of creating a second incident.
    return this.transactions.withTransaction(async (uow) => {
      const reservation = await uow.idempotency.reserve(
        'incident.create',
        idempotencyKey,
        requestHash
      );

      if (reservation.outcome === 'mismatch') {
        throw new IdempotencyConflictError(
          'Idempotency-Key was already used for a different incident request'
        );
      }
      if (reservation.outcome === 'in_progress') {
        throw new OperationInProgressError(
          'An incident request with this Idempotency-Key is still being processed'
        );
      }
      if (reservation.outcome === 'completed') {
        const record = reservation.result as CreateIncidentRecord;
        const existing = await uow.incidents.findById(record.incidentId);
        if (!existing) {
          // Unreachable while both rows commit in the same transaction; kept
          // so a future schema change cannot fail silently.
          throw new Error(
            `Idempotency record referenced missing incident ${record.incidentId}`
          );
        }
        return { incident: existing, replayed: true };
      }

      const now = new Date();
      const incident = Incident.create({
        id: randomUUID(),
        displayId: await uow.incidents.nextDisplayId(),
        propertyId: input.propertyId,
        unit: input.unit ?? null,
        type: input.type,
        priority: input.priority,
        description: input.description,
        reportedBy: input.reportedBy,
        createdAt: now
      });

      await uow.incidents.insert(incident);
      await uow.audit.append({
        // No authentication exists yet, so the API itself is the recorded
        // actor and the claimed reporter is metadata, not identity.
        actorType: 'system',
        actorId: 'fieldrelay-api',
        action: 'incident.created',
        entityType: 'incident',
        entityId: incident.id,
        correlationId: input.correlationId,
        metadata: {
          displayId: incident.displayId,
          propertyId: incident.propertyId,
          type: incident.type,
          priority: incident.priority,
          status: incident.status,
          requestHash
        }
      });
      await uow.idempotency.complete('incident.create', idempotencyKey, {
        incidentId: incident.id
      } satisfies CreateIncidentRecord);

      return { incident, replayed: false };
    });
  }
}
