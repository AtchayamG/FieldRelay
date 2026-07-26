import { TransactionPort } from './persistence.port';

export interface CallUsage {
  // Live calls this deployment placed, counted from its own records.
  placedByThisDeployment: number;
  // Live calls made outside this deployment — the CLI, the CALL-E dashboard, a
  // local run against the same account. This deployment cannot observe them, so
  // an operator supplies the figure and it is added to the total.
  placedElsewhere: number;
  // The honest headline number.
  totalLiveCallsPlaced: number;
  // Whether this deployment is currently capable of placing a real call.
  mode: 'demo' | 'live';
}

// Reports how many real calls have been placed — deliberately *not* how many
// remain.
//
// A "remaining" figure would be a guess presented as a fact, for three reasons:
// the published free allowance is inconsistent between CALL-E's own sources,
// CALL-E's API exposes no balance endpoint to reconcile against, and the
// allowance can be topped up at any time, which would make a cached number
// silently wrong. Calls placed is verifiable from this system's own records and
// never goes stale.
export class GetCallUsageUseCase {
  constructor(
    private readonly transactions: TransactionPort,
    private readonly placedElsewhere: number,
    private readonly mode: 'demo' | 'live'
  ) {}

  public async execute(): Promise<CallUsage> {
    const placedByThisDeployment = await this.transactions.withTransaction((uow) =>
      uow.calls.countLiveCalls()
    );

    return {
      placedByThisDeployment,
      placedElsewhere: this.placedElsewhere,
      totalLiveCallsPlaced: placedByThisDeployment + this.placedElsewhere,
      mode: this.mode
    };
  }
}

// Bounded so a malformed value cannot render a nonsensical total.
export function readPriorCallCount(raw: string | undefined): number {
  const parsed = Number((raw ?? '').trim());
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100_000 ? parsed : 0;
}
