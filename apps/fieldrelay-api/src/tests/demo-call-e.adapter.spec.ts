import { DemoCallEAdapter } from '../infrastructure/call-e/demo-call-e.adapter';
import { CallTask } from '../domain/call-task.entity';
import { MOCK_INCIDENT_ID, MOCK_CONTACT_ID, MOCK_PURPOSE } from '@fieldrelay/testing';

describe('DemoCallEAdapter', () => {
  it('labels its result simulated: true and never returns a live status', async () => {
    const adapter = new DemoCallEAdapter();
    const task = CallTask.create({
      id: 'CALL-E-test',
      incidentId: MOCK_INCIDENT_ID,
      authorizedContactId: MOCK_CONTACT_ID,
      purpose: MOCK_PURPOSE,
      idempotencyKey: 'idemp_test_1',
      timeoutSeconds: 300,
      retries: 0
    });

    const result = await adapter.startCall(task);

    expect(result.simulated).toBe(true);
    expect(result.status).toBe('queued');
    expect(result.providerTaskId).toMatch(/^demo_/);
  });
});
