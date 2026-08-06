import { describe, expect, it } from 'vitest';
import { buildOrchestration } from './mission-control-api.adapter';
import { MissionControlState } from '../domain/mission-control-state.model';

// The orchestration panel is the judge-visible surface for work that is
// otherwise invisible. These tests exist because the panel must never show a
// tidy green pipeline for a call that actually stopped, and must never render
// at all when there is nothing real behind it.

function state(overrides: Partial<MissionControlState> = {}): MissionControlState {
  return {
    metrics: { activeIncidents: 0, callsInFlight: 0, pendingApprovals: 0, realCallsPlaced: 0 },
    incidents: [],
    calls: [],
    approvals: [],
    guardrails: [],
    mode: 'live',
    generatedAt: new Date().toISOString(),
    ...overrides
  };
}

function call(overrides: Partial<MissionControlState['calls'][number]> = {}) {
  return {
    id: 'call-1',
    displayId: 'CALL-0001',
    incidentId: 'inc-1',
    purpose: 'vendor_availability',
    status: 'completed',
    simulated: false,
    createdAt: new Date().toISOString(),
    outcome: {
      taskCompleted: true,
      confidenceLabel: 'high',
      validationFailed: false,
      fields: ['available', 'quoted_amount_text']
    },
    ...overrides
  };
}

describe('buildOrchestration', () => {
  it('renders nothing when no call has ever been placed', () => {
    // An empty pipeline under a heading reads as a broken screen.
    expect(buildOrchestration(state())).toEqual([]);
  });

  it('describes the reservation happening before the dial, not after', () => {
    const steps = buildOrchestration(state({ calls: [call()] }));
    const reserve = steps.findIndex((step) => step.name === 'Task reserved before dialling');
    const dial = steps.findIndex((step) => step.name === 'Call placed');

    expect(reserve).toBeLessThan(dial);
    // The ordering is the claim; the copy must say so rather than leaving the
    // reader to infer it from step numbers.
    expect(steps[reserve].description).toMatch(/first|before/i);
  });

  it('refuses to show an unknown outcome as progress, and never as a redial', () => {
    const steps = buildOrchestration(
      state({ calls: [call({ status: 'outcome_unknown', outcome: null })] })
    );
    const stop = steps.find((step) => step.name === 'Outcome unknown — stopped');

    expect(stop).toBeDefined();
    expect(stop?.status).toBe('active');
    expect(stop?.description).toContain('will not redial');
    // Nothing downstream may claim to have completed.
    expect(steps.filter((step) => step.stepIndex > 5).every((step) => step.status === 'pending')).toBe(
      true
    );
  });

  it('does not raise an approval from an outcome nobody can confirm', () => {
    const steps = buildOrchestration(
      state({
        calls: [call({ status: 'outcome_unknown', outcome: null })],
        approvals: [
          { id: 'a1', displayId: 'APR-1', incidentId: 'inc-1', reasons: ['a price was quoted'], createdAt: new Date().toISOString() }
        ]
      })
    );

    expect(steps.at(-1)?.status).toBe('pending');
  });

  it('says a partial validation failure was refused rather than coerced', () => {
    const steps = buildOrchestration(
      state({
        calls: [
          call({
            outcome: { taskCompleted: true, confidenceLabel: 'low', validationFailed: true, fields: ['available'] }
          })
        ]
      })
    );
    const validated = steps.find((step) => step.name === 'Answer validated');

    expect(validated?.status).toBe('active');
    expect(validated?.description).toContain('not coerced');
  });

  it('states the reason when it stopped for approval, matching the recorded reasons', () => {
    const steps = buildOrchestration(
      state({
        calls: [call()],
        approvals: [
          {
            id: 'a1',
            displayId: 'APR-1',
            incidentId: 'inc-1',
            reasons: ['a price was quoted'],
            createdAt: new Date().toISOString()
          }
        ]
      })
    );
    const gate = steps.at(-1);

    expect(gate?.name).toBe('Stopped for human approval');
    expect(gate?.description).toContain('a price was quoted');
  });

  it('ignores approvals belonging to a different incident', () => {
    const steps = buildOrchestration(
      state({
        calls: [call()],
        approvals: [
          {
            id: 'a1',
            displayId: 'APR-1',
            incidentId: 'some-other-incident',
            reasons: ['a price was quoted'],
            createdAt: new Date().toISOString()
          }
        ]
      })
    );

    expect(steps.at(-1)?.name).toBe('Human approval');
  });

  it('does not claim a queued call was placed, and marks only one frontier', () => {
    // Caught on the live deployment: a queued task rendered "Waiting to dial"
    // above a description saying it had been placed.
    const steps = buildOrchestration(
      state({ calls: [call({ status: 'queued', outcome: null })] })
    );
    const dial = steps.find((step) => step.stepIndex === 4);

    expect(dial?.name).toBe('Waiting to dial');
    expect(dial?.description).not.toMatch(/placed/i);
    expect(dial?.status).toBe('active');
    expect(steps.filter((step) => step.status === 'active')).toHaveLength(1);
  });

  it('labels a demo call as using no real line', () => {
    const steps = buildOrchestration(state({ calls: [call({ simulated: true })] }));

    expect(steps.find((step) => step.name === 'Call placed')?.description).toContain('No real line');
  });

  it('never claims an answer was returned when the call went unanswered', () => {
    const steps = buildOrchestration(
      state({ calls: [call({ status: 'no_answer', outcome: null })] })
    );
    const answer = steps.find((step) => step.stepIndex === 5);

    expect(answer?.name).toBe('No answer');
    expect(answer?.description).not.toContain('structured data');
  });
});
