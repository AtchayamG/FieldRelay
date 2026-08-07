import { TransactionPort } from './persistence.port';

export interface CountBucket {
  key: string;
  count: number;
}

export interface AnalyticsResult {
  // Every figure below is a count of rows that exist. There is not one rate,
  // percentage or average in this response, and that is deliberate.
  incidentsByStatus: CountBucket[];
  incidentsByPriority: CountBucket[];
  callsByStatus: CountBucket[];
  callsByKind: CountBucket[];
  outcomes: {
    total: number;
    validated: number;
    // Calls that connected and produced something unusable. Separated from
    // "no outcome" on purpose: they have different remedies, and lumping them
    // together hides the one an operator can act on.
    validationFailed: number;
    taskCompleted: number;
  };
  approvalsByStatus: CountBucket[];
  approvalsByReason: CountBucket[];
  dispatchesByStatus: CountBucket[];

  // What cannot be reported yet, and what each is waiting on. Named explicitly
  // rather than omitted, because a missing metric reads as an oversight while a
  // stated one reads as a boundary.
  notYetMeasurable: Array<{ metric: string; needs: string }>;

  scannedRows: number;
  truncated: boolean;
  generatedAt: string;
}

// Analytics that refuses to compute a rate.
//
// A previous version of the Mission Control performance panel rendered
// `SLA Compliance (0%)` for a figure nothing had ever measured — a struct
// default displayed as a claim that the system meets its SLA zero percent of
// the time. This use case exists partly to make that class of mistake
// impossible to repeat: it returns counts and nothing else.
//
// Rates need a denominator, and this deployment does not have one yet. One
// incident is not a sample. When the data exists, the honest move is to add
// the rate here with its denominator beside it, not to divide two small
// numbers and print a percentage.
const SCAN_LIMIT = 200;

export class GetAnalyticsUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(): Promise<AnalyticsResult> {
    return this.transactions.withTransaction(async (uow) => {
      const incidentPage = await uow.incidents.list({ limit: SCAN_LIMIT });
      const callPage = await uow.calls.list({ limit: SCAN_LIMIT });
      const approvalPage = await uow.approvals.list({ limit: SCAN_LIMIT });
      const dispatchPage = await uow.dispatches.list({ limit: SCAN_LIMIT });

      const incidents = incidentPage.items;
      const calls = callPage.items;
      const approvals = approvalPage.items;
      const dispatches = dispatchPage.items;

      let outcomeTotal = 0;
      let outcomeValidated = 0;
      let outcomeFailed = 0;
      let outcomeCompleted = 0;
      for (const call of calls) {
        const outcome = await uow.outcomes.findByCallTaskId(call.id);
        if (!outcome) continue;
        outcomeTotal += 1;
        if (outcome.validationFailed) {
          outcomeFailed += 1;
        } else {
          outcomeValidated += 1;
        }
        if (outcome.taskCompleted) {
          outcomeCompleted += 1;
        }
      }

      const scannedRows =
        incidents.length + calls.length + approvals.length + dispatches.length;
      const truncated =
        incidentPage.nextCursor !== null ||
        callPage.nextCursor !== null ||
        approvalPage.nextCursor !== null ||
        dispatchPage.nextCursor !== null;

      return {
        incidentsByStatus: tally(incidents.map((i) => i.status)),
        incidentsByPriority: tally(incidents.map((i) => i.priority)),
        callsByStatus: tally(calls.map((c) => c.status)),
        callsByKind: tally(calls.map((c) => (c.simulated ? 'simulated' : 'real'))),
        outcomes: {
          total: outcomeTotal,
          validated: outcomeValidated,
          validationFailed: outcomeFailed,
          taskCompleted: outcomeCompleted
        },
        approvalsByStatus: tally(approvals.map((a) => a.status)),
        // One approval can carry several reasons, so this tallies reasons and
        // not approvals. The totals will not add up to the approval count, and
        // the UI says so rather than letting a reader assume they should.
        approvalsByReason: tally(approvals.flatMap((a) => a.reasons)),
        dispatchesByStatus: tally(dispatches.map((d) => d.status)),

        notYetMeasurable: [
          {
            metric: 'SLA compliance',
            needs: 'resolved incidents with a response target to compare against'
          },
          {
            metric: 'Automated resolution rate',
            needs: 'calls that closed without a person intervening'
          },
          {
            metric: 'Average time to first contact',
            needs: 'a recorded first-contact timestamp; only creation and update times exist today'
          },
          {
            metric: 'Vendor dispatch success rate',
            needs: 'dispatched jobs with a confirmed attendance outcome'
          }
        ],

        scannedRows,
        truncated,
        generatedAt: new Date().toISOString()
      };
    });
  }
}

function tally(values: string[]): CountBucket[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
