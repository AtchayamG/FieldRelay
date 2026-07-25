import { DemoCallEAdapter } from '../infrastructure/call-e/demo-call-e.adapter';
import { briefForPurpose } from '../application/call-brief';
import { CallTask } from '../domain/call-task.entity';
import { MOCK_INCIDENT_ID, MOCK_CONTACT_ID, MOCK_PURPOSE } from '@fieldrelay/testing';

describe('DemoCallEAdapter', () => {
  it('labels its result simulated: true and never returns a live status', async () => {
    const adapter = new DemoCallEAdapter();
    const task = CallTask.create({
      id: '11111111-1111-4111-8111-111111111190',
      displayId: 'CALL-2042-0001',
      incidentId: MOCK_INCIDENT_ID,
      provider: 'call-e',
      authorizedContactId: MOCK_CONTACT_ID,
      purpose: MOCK_PURPOSE,
      simulated: true,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date('2042-03-01T09:00:00.000Z')
    });

    const result = await adapter.startCall(task, briefForPurpose(MOCK_PURPOSE, task.displayId));

    expect(result.simulated).toBe(true);
    expect(result.status).toBe('queued');
    expect(result.providerTaskId).toMatch(/^demo_/);
  });

  it('declares itself simulated before any call is attempted', () => {
    expect(new DemoCallEAdapter().describe()).toEqual({ mode: 'demo', simulated: true });
  });
});
