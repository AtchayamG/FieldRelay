import { TransactionPort } from './persistence.port';

export interface TechnicianView {
  name: string;
  // Counted from incident rows, not from an HR system.
  incidentsRaised: number;
  openIncidents: number;
  lastActiveAt: string | null;
  // The statuses this person's incidents are currently sitting in, so the
  // roster says something about workload rather than just listing names.
  statusBreakdown: Array<{ status: string; count: number }>;
}

export interface TechnicianListResult {
  items: TechnicianView[];
  // How many incident rows the counts were derived from, and whether that was
  // all of them. A count that silently stopped at a page boundary is worse
  // than no count, so the API says which it is.
  derivedFromIncidents: number;
  truncated: boolean;
}

// FieldRelay does not maintain a staff directory, and this use case does not
// invent one.
//
// The roster is derived entirely from who appears in the operational record —
// the `reportedBy` field on incidents that actually exist. That means the
// screen can only ever show people who have really done something in the
// system, and every number on it is a count of rows rather than a metric
// somebody made up.
//
// The alternative was a seeded list of fictional technicians with fictional
// availability. It would have looked fuller and meant nothing.
const SCAN_LIMIT = 200;

export class ListTechniciansUseCase {
  constructor(private readonly transactions: TransactionPort) {}

  public async execute(): Promise<TechnicianListResult> {
    return this.transactions.withTransaction(async (uow) => {
      // Deliberately bounded. At demo scale this reads everything; at real
      // scale this use case would need a grouped query rather than a scan, and
      // `truncated` is how the UI finds out that day has arrived.
      const page = await uow.incidents.list({ limit: SCAN_LIMIT });
      const incidents = page.items;

      const byPerson = new Map<
        string,
        { raised: number; open: number; last: Date | null; statuses: Map<string, number> }
      >();

      for (const incident of incidents) {
        const name = incident.reportedBy;
        const entry = byPerson.get(name) ?? {
          raised: 0,
          open: 0,
          last: null,
          statuses: new Map<string, number>()
        };

        entry.raised += 1;
        if (incident.status !== 'resolved') {
          entry.open += 1;
        }
        if (entry.last === null || incident.updatedAt > entry.last) {
          entry.last = incident.updatedAt;
        }
        entry.statuses.set(incident.status, (entry.statuses.get(incident.status) ?? 0) + 1);

        byPerson.set(name, entry);
      }

      const items: TechnicianView[] = [...byPerson.entries()]
        .map(([name, entry]) => ({
          name,
          incidentsRaised: entry.raised,
          openIncidents: entry.open,
          lastActiveAt: entry.last?.toISOString() ?? null,
          statusBreakdown: [...entry.statuses.entries()]
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count)
        }))
        // Busiest first: the roster is read to find out who is carrying what.
        .sort((a, b) => b.openIncidents - a.openIncidents || b.incidentsRaised - a.incidentsRaised);

      return {
        items,
        derivedFromIncidents: incidents.length,
        truncated: page.nextCursor !== null
      };
    });
  }
}
