import { randomUUID } from 'node:crypto';
import { GetAnalyticsUseCase } from '../application/get-analytics.use-case';
import { ListTechniciansUseCase } from '../application/list-technicians.use-case';
import { GetMissionControlUseCase } from '../application/get-mission-control.use-case';
import { Incident } from '../domain/incident.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';

// The point of both these screens is that they only report things that were
// counted. These tests are mostly about what must NOT appear.

function seedIncidents(db: InMemoryDatabase): void {
  const rows: Array<{ by: string; status: string; priority: string }> = [
    { by: 'Demo Property Manager', status: 'triage', priority: 'critical' },
    { by: 'Demo Property Manager', status: 'intake', priority: 'high' },
    { by: 'Demo Field Supervisor', status: 'resolved', priority: 'medium' }
  ];

  for (const row of rows) {
    db.incidents.push(
      Incident.rehydrate({
        id: randomUUID(),
        displayId: `INC-2042-000${db.incidents.length + 1}`,
        propertyId: 'PROP-001',
        unit: '2A',
        type: 'plumbing',
        priority: row.priority as never,
        status: row.status as never,
        description: 'Fictional demo incident',
        reportedBy: row.by,
        createdAt: new Date('2026-07-01T10:00:00Z'),
        updatedAt: new Date('2026-07-02T10:00:00Z'),
        version: 1
      })
    );
  }
}

describe('GetAnalyticsUseCase', () => {
  it('returns counts and never a rate or percentage', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);
    const result = await new GetAnalyticsUseCase(new InMemoryTransactionManager(db)).execute();

    const serialised = JSON.stringify(result);
    // The defect this screen was built to avoid: a struct default rendered as
    // a claim. If a percent sign ever appears in this payload, something is
    // computing a rate without a denominator again.
    expect(serialised).not.toContain('%');
    expect(serialised).not.toMatch(/"[a-zA-Z]*(Rate|Percent|Percentage|Average|Avg)"/);
  });

  it('counts incidents by status from rows that exist', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);
    const result = await new GetAnalyticsUseCase(new InMemoryTransactionManager(db)).execute();

    const total = result.incidentsByStatus.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(3);
    expect(result.incidentsByStatus.find((b) => b.key === 'resolved')?.count).toBe(1);
  });

  it('names what it cannot measure and what each is waiting on', async () => {
    const db = new InMemoryDatabase();
    const result = await new GetAnalyticsUseCase(new InMemoryTransactionManager(db)).execute();

    // A missing metric reads as an oversight; a stated one reads as a boundary.
    expect(result.notYetMeasurable.length).toBeGreaterThan(0);
    for (const item of result.notYetMeasurable) {
      expect(item.metric.length).toBeGreaterThan(0);
      expect(item.needs.length).toBeGreaterThan(0);
    }
    expect(result.notYetMeasurable.map((i) => i.metric)).toContain('SLA compliance');
  });

  it('reports zero counts on an empty deployment without inventing anything', async () => {
    const db = new InMemoryDatabase();
    const result = await new GetAnalyticsUseCase(new InMemoryTransactionManager(db)).execute();

    expect(result.incidentsByStatus).toEqual([]);
    expect(result.outcomes.total).toBe(0);
    expect(result.scannedRows).toBe(0);
  });
});

describe('ListTechniciansUseCase', () => {
  it('derives the roster from who actually appears in the record', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);
    const result = await new ListTechniciansUseCase(new InMemoryTransactionManager(db)).execute();

    expect(result.items.map((p) => p.name).sort()).toEqual([
      'Demo Field Supervisor',
      'Demo Property Manager'
    ]);
    expect(result.derivedFromIncidents).toBe(3);
  });

  it('counts open work separately from total, so resolved does not read as load', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);
    const result = await new ListTechniciansUseCase(new InMemoryTransactionManager(db)).execute();

    const supervisor = result.items.find((p) => p.name === 'Demo Field Supervisor');
    expect(supervisor?.incidentsRaised).toBe(1);
    // Their only incident is resolved, so they are carrying nothing.
    expect(supervisor?.openIncidents).toBe(0);
  });

  it('lists the busiest person first, since that is why the roster is read', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);
    const result = await new ListTechniciansUseCase(new InMemoryTransactionManager(db)).execute();

    expect(result.items[0].name).toBe('Demo Property Manager');
    expect(result.items[0].openIncidents).toBe(2);
  });

  it('returns nobody rather than a placeholder when the record is empty', async () => {
    const db = new InMemoryDatabase();
    const result = await new ListTechniciansUseCase(new InMemoryTransactionManager(db)).execute();

    expect(result.items).toEqual([]);
    expect(result.derivedFromIncidents).toBe(0);
  });
});

describe('GetMissionControlUseCase', () => {
  it('counts every open domain status instead of stale presentation names', async () => {
    const db = new InMemoryDatabase();
    seedIncidents(db);

    const result = await new GetMissionControlUseCase(
      new InMemoryTransactionManager(db),
      0,
      'demo',
      false
    ).execute();

    expect(result.metrics.activeIncidents).toBe(2);
  });
});
