import { TransactionPort } from './persistence.port';

export class CheckHealthUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(): Promise<{ status: 'ok' }> {
    // A successful response proves the API can complete a real database query,
    // not merely that the Node process is accepting connections.
    await this.transactions.withTransaction((uow) =>
      uow.incidents.list({ limit: 1 })
    );
    return { status: 'ok' };
  }
}
