import { IncidentStatus } from '../domain/incident.entity';
import { CallValidationError } from './errors';
import { decodeIncidentCursor } from './incident-cursor';
import { IncidentPage, TransactionPort } from './persistence.port';

export const DEFAULT_INCIDENT_PAGE_SIZE = 20;
export const MAX_INCIDENT_PAGE_SIZE = 100;

const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'intake',
  'triage',
  'calling',
  'awaiting_approval',
  'dispatched',
  'resolved',
  'cancelled'
];

export interface ListIncidentsInput {
  limit?: number;
  cursor?: string;
  status?: string;
}

export class ListIncidentsUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(input: ListIncidentsInput = {}): Promise<IncidentPage> {
    const limit = input.limit ?? DEFAULT_INCIDENT_PAGE_SIZE;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_INCIDENT_PAGE_SIZE) {
      throw new CallValidationError(
        `limit must be an integer between 1 and ${MAX_INCIDENT_PAGE_SIZE}`
      );
    }
    if (input.status !== undefined && !INCIDENT_STATUSES.includes(input.status as IncidentStatus)) {
      throw new CallValidationError(
        `status must be one of: ${INCIDENT_STATUSES.join(', ')}`
      );
    }
    // Decoded here so a malformed cursor fails validation rather than reaching
    // the query builder.
    if (input.cursor !== undefined) decodeIncidentCursor(input.cursor);

    return this.transactions.withTransaction((uow) =>
      uow.incidents.list({
        limit,
        cursor: input.cursor,
        status: input.status as IncidentStatus | undefined
      })
    );
  }
}
