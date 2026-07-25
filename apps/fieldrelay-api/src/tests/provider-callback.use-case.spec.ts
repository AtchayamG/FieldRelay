import { createHmac, createHash } from 'node:crypto';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { ProcessProviderCallbackUseCase } from '../application/process-provider-callback.use-case';
import {
  CallbackAuthenticationError,
  CallValidationError,
  IdempotencyConflictError
} from '../application/errors';
import { CallTask } from '../domain/call-task.entity';

describe('ProcessProviderCallbackUseCase', () => {
  let db: InMemoryDatabase;
  let transactions: InMemoryTransactionManager;
  let useCase: ProcessProviderCallbackUseCase;
  const secret = 'super_secret_callback_key_123456';

  beforeEach(() => {
    db = new InMemoryDatabase();
    transactions = new InMemoryTransactionManager(db);
    useCase = new ProcessProviderCallbackUseCase(transactions);
  });

  function createSignedInput(bodyObj: Record<string, unknown>, timestampOffsetSec = 0) {
    const rawBody = Buffer.from(JSON.stringify(bodyObj));
    const timestampHeader = String(Math.floor(Date.now() / 1000) + timestampOffsetSec);
    const signatureHeader = createHmac('sha256', secret)
      .update(`${timestampHeader}.`)
      .update(rawBody)
      .digest('hex');
    return { rawBody, timestampHeader, signatureHeader, body: bodyObj, signingSecret: secret };
  }

  describe('Signature Verification', () => {
    it('accepts valid HMAC signature and current timestamp', () => {
      const input = createSignedInput({ eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' });
      expect(() =>
        useCase.verifySignature(
          input.rawBody,
          input.timestampHeader,
          input.signatureHeader,
          input.signingSecret
        )
      ).not.toThrow();
    });

    it('rejects missing or weak signing secret', () => {
      const input = createSignedInput({ eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' });
      expect(() =>
        useCase.verifySignature(input.rawBody, input.timestampHeader, input.signatureHeader, '')
      ).toThrow(CallbackAuthenticationError);
      expect(() =>
        useCase.verifySignature(input.rawBody, input.timestampHeader, input.signatureHeader, 'short')
      ).toThrow(CallbackAuthenticationError);
    });

    it('rejects missing headers', () => {
      const input = createSignedInput({ eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' });
      expect(() =>
        useCase.verifySignature(input.rawBody, undefined, input.signatureHeader, secret)
      ).toThrow(CallbackAuthenticationError);
      expect(() =>
        useCase.verifySignature(input.rawBody, input.timestampHeader, undefined, secret)
      ).toThrow(CallbackAuthenticationError);
    });

    it('rejects stale timestamp older than 5 minutes', () => {
      const input = createSignedInput(
        { eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' },
        -360
      );
      expect(() =>
        useCase.verifySignature(
          input.rawBody,
          input.timestampHeader,
          input.signatureHeader,
          input.signingSecret
        )
      ).toThrow(CallbackAuthenticationError);
    });

    it('rejects future timestamp farther than 5 minutes', () => {
      const input = createSignedInput(
        { eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' },
        360
      );
      expect(() =>
        useCase.verifySignature(
          input.rawBody,
          input.timestampHeader,
          input.signatureHeader,
          input.signingSecret
        )
      ).toThrow(CallbackAuthenticationError);
    });

    it('rejects invalid/altered HMAC signature', () => {
      const input = createSignedInput({ eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' });
      const badSig = 'a'.repeat(64);
      expect(() =>
        useCase.verifySignature(input.rawBody, input.timestampHeader, badSig, secret)
      ).toThrow(CallbackAuthenticationError);
    });

    it('rejects malformed signature string (non-hex)', () => {
      const input = createSignedInput({ eventId: 'e1', providerTaskId: 'pt1', status: 'ringing' });
      expect(() =>
        useCase.verifySignature(input.rawBody, input.timestampHeader, 'not_a_hex_string', secret)
      ).toThrow(CallbackAuthenticationError);
    });
  });

  describe('DTO Validation', () => {
    it('accepts valid bounded DTO', () => {
      const validated = useCase.validateDto({
        eventId: 'evt_100',
        providerTaskId: 'task_200',
        status: 'connected'
      });
      expect(validated).toEqual({
        eventId: 'evt_100',
        providerTaskId: 'task_200',
        status: 'connected'
      });
    });

    it('rejects invalid statuses (e.g. queued or outcome_unknown)', () => {
      expect(() =>
        useCase.validateDto({ eventId: 'e1', providerTaskId: 'p1', status: 'queued' })
      ).toThrow(CallValidationError);
      expect(() =>
        useCase.validateDto({ eventId: 'e1', providerTaskId: 'p1', status: 'outcome_unknown' })
      ).toThrow(CallValidationError);
    });

    it('rejects payloads containing transcript or outcome blobs', () => {
      expect(() =>
        useCase.validateDto({
          eventId: 'e1',
          providerTaskId: 'p1',
          status: 'completed',
          transcript: 'Full audio transcript here'
        })
      ).toThrow(CallValidationError);

      expect(() =>
        useCase.validateDto({
          eventId: 'e1',
          providerTaskId: 'p1',
          status: 'completed',
          outcome: { recordingUrl: 'http://secret.mp3' }
        })
      ).toThrow(CallValidationError);
    });
  });

  describe('Acceptance and Exact Replay', () => {
    it('persists callback and returns accepted', async () => {
      const input = createSignedInput({ eventId: 'evt_1', providerTaskId: 'pt_1', status: 'ringing' });
      const outcome = await useCase.accept(input);
      expect(outcome).toEqual({ type: 'accepted', eventId: 'evt_1' });
      expect(db.callbacks.length).toBe(1);
    });

    it('returns exact_replay for identical event ID delivery without duplicating persistence', async () => {
      const input = createSignedInput({ eventId: 'evt_1', providerTaskId: 'pt_1', status: 'ringing' });
      await useCase.accept(input);
      const replay = await useCase.accept(input);

      expect(replay).toEqual({ type: 'exact_replay', eventId: 'evt_1' });
      expect(db.callbacks.length).toBe(1);
    });

    it('throws IdempotencyConflictError for conflicting event ID reuse', async () => {
      const input1 = createSignedInput({ eventId: 'evt_1', providerTaskId: 'pt_1', status: 'ringing' });
      const input2 = createSignedInput({ eventId: 'evt_1', providerTaskId: 'pt_1', status: 'connected' });

      await useCase.accept(input1);
      await expect(useCase.accept(input2)).rejects.toThrow(IdempotencyConflictError);
    });

    it('never persists raw body or raw provider payload', async () => {
      const bodyObj = { eventId: 'evt_raw_test', providerTaskId: 'pt_1', status: 'completed' };
      const input = createSignedInput(bodyObj);
      await useCase.accept(input);

      const record = db.callbacks[0];
      expect(record).toBeDefined();
      expect(record.eventId).toBe('evt_raw_test');
      expect(record.providerTaskId).toBe('pt_1');
      expect(record.status).toBe('completed');
      expect(record.payloadHash).toBe(
        createHash('sha256').update(input.rawBody).digest('hex')
      );
      // Ensure no raw body property exists
      expect((record as unknown as Record<string, unknown>).rawBody).toBeUndefined();
      expect((record as unknown as Record<string, unknown>).body).toBeUndefined();
    });
  });

  describe('Asynchronous Processing & State Transitions', () => {
    async function seedCallTask(providerTaskId: string, status: 'queued' | 'ringing' | 'connected' | 'outcome_unknown' | 'completed' = 'queued') {
      const task = CallTask.create({
        id: 'task_uuid_1',
        displayId: 'CALL-2042-0001',
        incidentId: '00000000-0000-0000-0000-000000000001',
        provider: 'call-e',
        authorizedContactId: 'CNS-001',
        purpose: 'vendor_availability',
        simulated: true,
        timeoutSeconds: 300,
        retries: 0,
        createdAt: new Date()
      });
      if (status !== 'queued') {
        if (status === 'outcome_unknown') {
          task.recordProviderResult({ providerTaskId, status: 'queued', simulated: true, at: new Date() });
          task.markOutcomeUnknown(new Date());
        } else {
          task.recordProviderResult({ providerTaskId, status, simulated: true, at: new Date() });
        }
      } else {
        // Set providerTaskId manually if queued
        task.recordProviderResult({ providerTaskId, status: 'queued', simulated: true, at: new Date() });
      }
      await transactions.withTransaction((uow) => uow.calls.insert(task));
      return task;
    }

    it('processes valid forward transition queued -> ringing -> connected -> completed', async () => {
      const task = await seedCallTask('pt_1', 'queued');

      const input1 = createSignedInput({ eventId: 'evt_1', providerTaskId: 'pt_1', status: 'ringing' });
      await useCase.accept(input1);
      await useCase.processAccepted('evt_1');

      let updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('ringing');

      const input2 = createSignedInput({ eventId: 'evt_2', providerTaskId: 'pt_1', status: 'connected' });
      await useCase.accept(input2);
      await useCase.processAccepted('evt_2');

      updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('connected');

      const input3 = createSignedInput({ eventId: 'evt_3', providerTaskId: 'pt_1', status: 'completed' });
      await useCase.accept(input3);
      await useCase.processAccepted('evt_3');

      updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('completed');
    });

    it('reconciles task in outcome_unknown status to terminal status via callback', async () => {
      const task = await seedCallTask('pt_unknown_test', 'outcome_unknown');

      const input = createSignedInput({
        eventId: 'evt_reconcile',
        providerTaskId: 'pt_unknown_test',
        status: 'completed'
      });
      await useCase.accept(input);
      await useCase.processAccepted('evt_reconcile');

      const updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('completed');
    });

    it('treats duplicate/same-state delivery as a no-op', async () => {
      const task = await seedCallTask('pt_same_state', 'connected');

      const input = createSignedInput({
        eventId: 'evt_same',
        providerTaskId: 'pt_same_state',
        status: 'connected'
      });
      await useCase.accept(input);
      await useCase.processAccepted('evt_same');

      const callback = db.callbacks.find((c) => c.eventId === 'evt_same');
      expect(callback?.processingOutcome).toBe('same_state_noop');

      const updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('connected');
    });

    it('rejects regressive transition (completed -> ringing) without modifying task state', async () => {
      const task = await seedCallTask('pt_regress', 'completed');

      const input = createSignedInput({
        eventId: 'evt_regress',
        providerTaskId: 'pt_regress',
        status: 'ringing'
      });
      await useCase.accept(input);
      await useCase.processAccepted('evt_regress');

      const callback = db.callbacks.find((c) => c.eventId === 'evt_regress');
      expect(callback?.processingOutcome).toBe('rejected_invalid_transition');

      const updatedTask = await transactions.withTransaction((uow) => uow.calls.findById(task.id));
      expect(updatedTask?.status).toBe('completed');

      expect(db.auditEvents.some((e) => e.action === 'call.callback.rejected_invalid_transition')).toBe(true);
    });

    it('records rejected processing outcome and audit event for unknown provider task ID', async () => {
      const input = createSignedInput({
        eventId: 'evt_unknown_pt',
        providerTaskId: 'non_existent_provider_task_999',
        status: 'completed'
      });
      await useCase.accept(input);
      await useCase.processAccepted('evt_unknown_pt');

      const callback = db.callbacks.find((c) => c.eventId === 'evt_unknown_pt');
      expect(callback?.processingOutcome).toBe('rejected_unknown_task');

      expect(db.auditEvents.some((e) => e.action === 'call.callback.rejected_unknown_task')).toBe(true);
    });
  });
});
