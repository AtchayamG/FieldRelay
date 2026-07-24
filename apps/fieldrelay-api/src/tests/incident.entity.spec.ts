import { Incident, IncidentInvariantError } from '../domain/incident.entity';

const build = (): Incident =>
  Incident.create({
    id: '11111111-1111-4111-8111-111111111101',
    displayId: 'INC-2042-0001',
    propertyId: '  PROP-001  ',
    unit: '   ',
    type: 'plumbing',
    priority: 'critical',
    description: '  Mixer valve failure.  ',
    reportedBy: 'Demo Property Manager',
    createdAt: new Date('2042-03-01T09:12:00.000Z')
  });

describe('Incident', () => {
  it('normalizes text and starts in the intake state', () => {
    const incident = build();

    expect(incident.propertyId).toBe('PROP-001');
    expect(incident.description).toBe('Mixer valve failure.');
    // A blank unit is absent, not an empty string.
    expect(incident.unit).toBeNull();
    expect(incident.status).toBe('intake');
    expect(incident.version).toBe(1);
    expect(incident.updatedAt).toEqual(incident.createdAt);
  });

  it('advances through allowed lifecycle transitions and bumps the version', () => {
    const incident = build();
    const at = new Date('2042-03-01T09:40:00.000Z');

    incident.transitionTo('triage', at);
    expect(incident.status).toBe('triage');
    expect(incident.version).toBe(2);
    expect(incident.updatedAt).toEqual(at);

    incident.transitionTo('calling', at);
    incident.transitionTo('awaiting_approval', at);
    incident.transitionTo('dispatched', at);
    incident.transitionTo('resolved', at);
    expect(incident.version).toBe(6);
  });

  it('refuses a transition that is not on the lifecycle', () => {
    const incident = build();
    expect(() => incident.transitionTo('resolved', new Date())).toThrow(IncidentInvariantError);
    expect(incident.status).toBe('intake');
    expect(incident.version).toBe(1);
  });

  it('refuses to move out of a terminal state', () => {
    const incident = build();
    const at = new Date();
    incident.transitionTo('cancelled', at);
    expect(() => incident.transitionTo('triage', at)).toThrow(IncidentInvariantError);
  });

  it('round-trips through rehydrate without re-normalizing', () => {
    const original = build();
    const copy = Incident.rehydrate(original.toProps());
    expect(copy.toProps()).toEqual(original.toProps());
  });

  it('does not expose its internal state for mutation', () => {
    const incident = build();
    const props = incident.toProps();
    props.status = 'resolved';
    expect(incident.status).toBe('intake');
  });
});
