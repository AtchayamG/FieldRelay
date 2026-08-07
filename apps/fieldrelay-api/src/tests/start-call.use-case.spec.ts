import { StartCallUseCase, StartCallInput } from '../application/start-call.use-case';
import { CallEPort } from '../application/call-e.port';
import { ContactAuthorizationPort } from '../application/contact-authorization.port';
import {
  CallAuthorizationError,
  CallValidationError,
  IdempotencyConflictError,
  NotFoundError,
  OperationInProgressError
} from '../application/errors';
import { CallTask } from '../domain/call-task.entity';
import { Incident } from '../domain/incident.entity';
import {
  InMemoryDatabase,
  InMemoryTransactionManager
} from '../infrastructure/persistence/memory/in-memory-unit-of-work';
import { MOCK_INCIDENT_ID, MOCK_CONTACT_ID, MOCK_PURPOSE } from '@fieldrelay/testing';

const SECOND_INCIDENT_ID = '11111111-1111-4111-8111-111111111192';

const validInput = (over: Partial<StartCallInput> = {}): StartCallInput => ({
  incidentId: MOCK_INCIDENT_ID,
  authorizedContactId: MOCK_CONTACT_ID,
  purpose: MOCK_PURPOSE,
  idempotencyKey: 'idemp_test_1',
  ...over
});

describe('StartCallUseCase', () => {
  let useCase: StartCallUseCase;
  let mockPort: jest.Mocked<CallEPort>;
  let mockContacts: jest.Mocked<ContactAuthorizationPort>;
  let db: InMemoryDatabase;

  beforeEach(() => {
    mockPort = {
      describe: jest.fn().mockReturnValue({ mode: 'demo', simulated: true }),
      startCall: jest.fn()
    };
    mockContacts = { resolve: jest.fn(), list: jest.fn() };
    mockContacts.resolve.mockResolvedValue({
      contactId: MOCK_CONTACT_ID,
      authorizationStatus: 'authorized',
      allowedPurposes: [MOCK_PURPOSE]
    });
    db = new InMemoryDatabase();
    db.incidents.push(
      Incident.create({
        id: MOCK_INCIDENT_ID,
        displayId: 'INC-2042-0891',
        propertyId: 'PROP-TEST',
        unit: '4B',
        type: 'plumbing',
        priority: 'high',
        description: 'Fictional test incident.',
        reportedBy: 'Demo Reporter',
        createdAt: new Date('2042-03-01T09:00:00.000Z')
      }),
      Incident.create({
        id: SECOND_INCIDENT_ID,
        displayId: 'INC-2042-0892',
        propertyId: 'PROP-TEST',
        unit: '5C',
        type: 'hvac',
        priority: 'medium',
        description: 'Second fictional test incident.',
        reportedBy: 'Demo Reporter',
        createdAt: new Date('2042-03-01T10:00:00.000Z')
      })
    );
    useCase = new StartCallUseCase(mockPort, mockContacts, new InMemoryTransactionManager(db));
  });

  const providerSucceeds = (providerTaskId = 'mock_task_123'): void => {
    mockPort.startCall.mockResolvedValue({
      providerTaskId,
      status: 'queued',
      simulated: true
    });
  };

  it('queues and starts a call through the provider on the happy path', async () => {
    providerSucceeds();

    const result = await useCase.execute(validInput());

    expect(result.status).toBe('queued');
    expect(result.providerTaskId).toBe('mock_task_123');
    expect(result.simulated).toBe(true);
    expect(result.replayed).toBe(false);
    expect(result.callTaskId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result.displayId).toMatch(/^CALL-2042-/);
    expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    const task = mockPort.startCall.mock.calls[0][0] as CallTask;
    expect(task.status).toBe('queued');
    expect(db.callTasks).toEqual([
      expect.objectContaining({
        id: task.id,
        status: 'queued',
        providerTaskId: 'mock_task_123',
        version: 2
      })
    ]);
  });

  it('commits the queued task before invoking the provider', async () => {
    mockPort.startCall.mockImplementation(async (task) => {
      expect(db.callTasks).toEqual([
        expect.objectContaining({ id: task.id, status: 'queued', providerTaskId: null })
      ]);
      expect(db.idempotency.get('call.start::idemp_test_1')).toMatchObject({
        state: 'in_progress'
      });
      return { providerTaskId: 'mock_task_123', status: 'queued', simulated: true };
    });

    await useCase.execute(validInput());

    expect(mockPort.startCall).toHaveBeenCalledTimes(1);
  });

  // Every guard below must reject BEFORE the provider is invoked.
  const guardCases: Array<{ name: string; input: StartCallInput; error: unknown }> = [
    { name: 'empty incidentId', input: validInput({ incidentId: '' }), error: CallValidationError },
    { name: 'non-UUID incidentId', input: validInput({ incidentId: 'INC-2042-0891' }), error: CallValidationError },
    { name: 'empty contactId', input: validInput({ authorizedContactId: '' }), error: CallValidationError },
    { name: 'empty purpose', input: validInput({ purpose: '' }), error: CallValidationError },
    { name: 'empty idempotencyKey', input: validInput({ idempotencyKey: '' }), error: CallValidationError },
    { name: 'oversized idempotencyKey', input: validInput({ idempotencyKey: 'k'.repeat(256) }), error: CallValidationError },
    { name: 'idempotencyKey with a space', input: validInput({ idempotencyKey: 'idemp key' }), error: CallValidationError },
    { name: 'timeout below bound', input: validInput({ timeoutSeconds: 1 }), error: CallValidationError },
    { name: 'timeout above bound', input: validInput({ timeoutSeconds: 100000 }), error: CallValidationError },
    { name: 'non-integer timeout', input: validInput({ timeoutSeconds: 60.5 }), error: CallValidationError },
    { name: 'negative retries', input: validInput({ retries: -1 }), error: CallValidationError },
    { name: 'retries above bound', input: validInput({ retries: 99 }), error: CallValidationError }
  ];

  it.each(guardCases)('rejects $name without calling the provider', async ({ input, error }) => {
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(mockPort.startCall).not.toHaveBeenCalled();
  });

  it('rejects an unresolved contact without calling the provider', async () => {
    mockContacts.resolve.mockResolvedValue(null);
    await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(CallAuthorizationError);
    expect(mockPort.startCall).not.toHaveBeenCalled();
  });

  it('rejects an unknown incident before resolving a contact or calling the provider', async () => {
    await expect(
      useCase.execute(
        validInput({ incidentId: '11111111-1111-4111-8111-111111119999' })
      )
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockContacts.resolve).not.toHaveBeenCalled();
    expect(mockPort.startCall).not.toHaveBeenCalled();
  });

  it('rejects a contact whose authorization is not "authorized"', async () => {
    mockContacts.resolve.mockResolvedValue({
      contactId: MOCK_CONTACT_ID,
      authorizationStatus: 'revoked',
      allowedPurposes: [MOCK_PURPOSE]
    });
    await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(CallAuthorizationError);
    expect(mockPort.startCall).not.toHaveBeenCalled();
  });

  it('rejects a purpose the contact has not authorized', async () => {
    mockContacts.resolve.mockResolvedValue({
      contactId: MOCK_CONTACT_ID,
      authorizationStatus: 'authorized',
      allowedPurposes: ['appointment_confirmation']
    });
    await expect(useCase.execute(validInput({ purpose: 'vendor_availability' }))).rejects.toBeInstanceOf(
      CallAuthorizationError
    );
    expect(mockPort.startCall).not.toHaveBeenCalled();
  });

  describe('idempotency', () => {
    it('records the completed outcome and an audit event', async () => {
      providerSucceeds();
      const result = await useCase.execute(validInput());

      expect(db.idempotency.get('call.start::idemp_test_1')).toMatchObject({
        state: 'completed',
        result: { providerTaskId: 'mock_task_123', callTaskId: result.callTaskId }
      });
      expect(db.callTasks).toHaveLength(1);
      expect(db.callTasks[0]).toMatchObject({
        id: result.callTaskId,
        status: 'queued',
        providerTaskId: 'mock_task_123'
      });
      expect(db.auditEvents).toHaveLength(2);
      expect(db.auditEvents[1]).toMatchObject({
        action: 'call.start.completed',
        entityType: 'call_task',
        entityId: result.callTaskId
      });
    });

    it('replays the stored result and never dials again for a duplicate request', async () => {
      providerSucceeds();
      const first = await useCase.execute(validInput());
      const second = await useCase.execute(validInput());

      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
      expect(second.replayed).toBe(true);
      expect(second.callTaskId).toBe(first.callTaskId);
      expect(second.providerTaskId).toBe(first.providerTaskId);
      expect(second.status).toBe(first.status);
      expect(second.simulated).toBe(first.simulated);
    });

    it('treats an omitted timeout and the explicit default as the same request', async () => {
      providerSucceeds();
      await useCase.execute(validInput());
      const replay = await useCase.execute(validInput({ timeoutSeconds: 300, retries: 0 }));

      expect(replay.replayed).toBe(true);
      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    });

    it('conflicts when the same key carries a different request', async () => {
      providerSucceeds();
      await useCase.execute(validInput());

      await expect(
        useCase.execute(validInput({ incidentId: SECOND_INCIDENT_ID }))
      ).rejects.toBeInstanceOf(IdempotencyConflictError);
      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    });

    it('conflicts when only a bounded parameter differs', async () => {
      providerSucceeds();
      await useCase.execute(validInput());

      await expect(useCase.execute(validInput({ retries: 2 }))).rejects.toBeInstanceOf(
        IdempotencyConflictError
      );
      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    });

    it('refuses an in-progress duplicate instead of placing a second call', async () => {
      // Hold the provider open so the first request is still mid-flight.
      let releaseProvider: () => void = () => undefined;
      mockPort.startCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseProvider = () =>
              resolve({ providerTaskId: 'mock_task_123', status: 'queued', simulated: true });
          })
      );

      const inFlight = useCase.execute(validInput());
      await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(
        OperationInProgressError
      );

      releaseProvider();
      await inFlight;
      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    });

    it('places exactly one call when the same key arrives concurrently', async () => {
      providerSucceeds();

      const settled = await Promise.allSettled([
        useCase.execute(validInput()),
        useCase.execute(validInput()),
        useCase.execute(validInput())
      ]);

      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
      expect(settled.some((outcome) => outcome.status === 'fulfilled')).toBe(true);
      // Nothing may fail for a reason other than the duplicate being suppressed.
      for (const outcome of settled) {
        if (outcome.status === 'rejected') {
          expect(outcome.reason).toBeInstanceOf(OperationInProgressError);
        }
      }
    });

    it('audits every suppressed duplicate', async () => {
      providerSucceeds();
      await useCase.execute(validInput());
      await useCase.execute(validInput());

      const suppressed = db.auditEvents.filter(
        (event) => event.action === 'call.start.duplicate_suppressed'
      );
      expect(suppressed).toHaveLength(1);
      expect(suppressed[0].metadata).toMatchObject({
        reason: 'already_completed'
      });
      expect(suppressed[0].metadata).not.toHaveProperty('idempotencyKey');
    });

    it('keeps the key reserved when the provider outcome is ambiguous', async () => {
      mockPort.startCall.mockRejectedValueOnce(new Error('provider unavailable'));

      await expect(useCase.execute(validInput())).rejects.toThrow('provider unavailable');
      expect(db.idempotency.get('call.start::idemp_test_1')).toMatchObject({
        state: 'in_progress'
      });
      expect(db.auditEvents.map((event) => event.action)).toContain(
        'call.start.outcome_unknown'
      );
      expect(db.callTasks).toHaveLength(1);
      expect(db.callTasks[0]).toMatchObject({
        status: 'outcome_unknown',
        failureCode: 'provider_unavailable'
      });

      providerSucceeds('mock_task_retry');
      await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(
        OperationInProgressError
      );
      expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    });

    it('keeps distinct keys independent', async () => {
      providerSucceeds();
      await useCase.execute(validInput({ idempotencyKey: 'idemp_a' }));
      await useCase.execute(validInput({ idempotencyKey: 'idemp_b' }));

      expect(mockPort.startCall).toHaveBeenCalledTimes(2);
    });
  });
});
