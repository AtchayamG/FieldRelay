import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import { CallTask } from '../domain/call-task.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { CalleWebhookTranslator } from '../infrastructure/call-e/calle-webhook.translator';

const TOKEN = 'a-sufficiently-long-webhook-token-value';
const CALL_TASK_ID = '11111111-1111-4111-8111-111111111111';
const PROVIDER_ID = 'call_MzD1ou1AbX1XtYkTnxMCBA';

// Exercises the whole ingestion path a real CALL-E webhook takes: envelope in,
// validated outcome persisted, audit event appended.
async function ingest(structuredResult: unknown, taskCompleted = true) {
  const database = new InMemoryDatabase();
  const transactions = new InMemoryTransactionManager(database);

  await transactions.withTransaction(async (uow) => {
    const task = CallTask.create({
      id: CALL_TASK_ID,
      displayId: 'CALL-2042-0001',
      incidentId: '22222222-2222-4222-8222-222222222222',
      provider: 'call-e',
      purpose: 'vendor_availability',
      authorizedContactId: 'CNS-4491',
      simulated: false,
      timeoutSeconds: 300,
      retries: 0,
      createdAt: new Date('2026-07-26T10:00:00.000Z')
    });
    task.recordProviderResult({
      providerTaskId: PROVIDER_ID,
      status: 'queued',
      simulated: false,
      at: new Date('2026-07-26T10:00:01.000Z')
    });
    await uow.calls.insert(task);
  });

  const translator = new CalleWebhookTranslator(TOKEN);
  const translated = translator.translate({
    id: 'evt_terminal_1',
    type: 'call.completed',
    created_at: '2026-07-26T10:03:00Z',
    data: {
      id: PROVIDER_ID,
      status: 'completed',
      structured_result: structuredResult,
      task_completed: taskCompleted,
      completion_confidence: { score: 0.82, label: 'high' },
      summary: 'The vendor can attend tomorrow morning.',
      recipients: [{ phones: ['+919999900000'], attempts: [{ transcript_turns: [] }] }]
    }
  });

  const useCase = new ProcessProviderCallbackUseCase(transactions);
  await useCase.acceptVerified(translated!, Buffer.from(JSON.stringify(translated)));

  const stored = await transactions.withTransaction((uow) =>
    uow.outcomes.findByCallTaskId(CALL_TASK_ID)
  );
  return { stored, database };
}

describe('structured outcome ingestion', () => {
  it('stores a valid answer against the call task that produced it', async () => {
    const { stored } = await ingest({
      available: 'yes',
      earliest_eta_minutes: 45,
      quoted_amount_text: '$360'
    });

    expect(stored).toMatchObject({
      callTaskId: CALL_TASK_ID,
      structuredResult: {
        available: 'yes',
        earliest_eta_minutes: 45,
        quoted_amount_text: '$360'
      },
      taskCompleted: true,
      confidenceScore: 0.82,
      confidenceLabel: 'high',
      validationFailed: false
    });
  });

  it('records an unusable answer rather than discarding the fact of the call', async () => {
    // "maybe" is not a declared enum value. The call still happened, and an
    // operator has to be able to see that it produced nothing actionable.
    const { stored } = await ingest({ available: 'maybe' });

    expect(stored?.validationFailed).toBe(true);
    expect(stored?.structuredResult).toEqual({});
  });

  it('never persists the transcript, summary or recipient number', async () => {
    const { stored, database } = await ingest({ available: 'yes' });

    const everythingStored = JSON.stringify({
      outcome: stored,
      audit: database.auditEvents
    });
    expect(everythingStored).not.toContain('919999900000');
    expect(everythingStored).not.toContain('tomorrow morning');
  });

  it('audits the field names but never the answers themselves', async () => {
    const { database } = await ingest({ available: 'yes', quoted_amount_text: '$360' });

    const event = database.auditEvents.find((entry) => entry.action === 'call.outcome.recorded');
    expect(event?.metadata.fields).toEqual(['available', 'quoted_amount_text']);
    // The values came from a stranger on a telephone and do not belong in an
    // append-only log.
    expect(JSON.stringify(event?.metadata)).not.toContain('$360');
  });

  it('distinguishes a validation failure in the audit trail', async () => {
    const { database } = await ingest({ available: 'maybe' });

    expect(
      database.auditEvents.some(
        (entry) => entry.action === 'call.outcome.recorded_with_validation_failure'
      )
    ).toBe(true);
  });

  it('records that the task was not completed even when the call was', async () => {
    // A call can connect and finish while the goal it was placed for fails.
    const { stored } = await ingest({ available: 'no' }, false);

    expect(stored?.taskCompleted).toBe(false);
    expect(stored?.validationFailed).toBe(false);
  });
});
