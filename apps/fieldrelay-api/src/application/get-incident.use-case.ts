import { Incident } from '../domain/incident.entity';
import { CallValidationError, NotFoundError } from './errors';
import { TransactionPort } from './persistence.port';

// Incident ids are UUIDs. Rejecting anything else keeps malformed input out of
// the query layer, where a bad literal would surface as a database error.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetIncidentUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(id: string): Promise<Incident> {
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      throw new CallValidationError('incidentId must be a UUID');
    }

    const incident = await this.transactions.withTransaction((uow) =>
      uow.incidents.findById(id)
    );
    if (!incident) {
      throw new NotFoundError(`Incident ${id} was not found`);
    }
    return incident;
  }
}
