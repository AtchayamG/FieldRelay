import { StartCallUseCase, StartCallInput } from '../application/start-call.use-case';
import { CallEPort } from '../application/call-e.port';
import { ContactAuthorizationPort } from '../application/contact-authorization.port';
import { CallAuthorizationError, CallValidationError } from '../application/errors';
import { CallTask } from '../domain/call-task.entity';
import { MOCK_INCIDENT_ID, MOCK_CONTACT_ID, MOCK_PURPOSE } from '@fieldrelay/testing';

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

  beforeEach(() => {
    mockPort = { startCall: jest.fn() };
    mockContacts = { resolve: jest.fn() };
    mockContacts.resolve.mockResolvedValue({
      contactId: MOCK_CONTACT_ID,
      authorizationStatus: 'authorized',
      allowedPurposes: [MOCK_PURPOSE]
    });
    useCase = new StartCallUseCase(mockPort, mockContacts);
  });

  it('queues and starts a call through the provider on the happy path', async () => {
    mockPort.startCall.mockResolvedValue({
      providerTaskId: 'mock_task_123',
      status: 'queued',
      simulated: true
    });

    const result = await useCase.execute(validInput());

    expect(result.status).toBe('queued');
    expect(result.providerTaskId).toBe('mock_task_123');
    expect(result.simulated).toBe(true);
    expect(result.callTaskId).toMatch(/^CALL-E-/);
    expect(mockPort.startCall).toHaveBeenCalledTimes(1);
    const task = mockPort.startCall.mock.calls[0][0] as CallTask;
    expect(task.status).toBe('queued');
    expect(task.idempotencyKey).toBe('idemp_test_1');
  });

  // Every guard below must reject BEFORE the provider is invoked.
  const guardCases: Array<{ name: string; input: StartCallInput; error: unknown }> = [
    { name: 'empty incidentId', input: validInput({ incidentId: '' }), error: CallValidationError },
    { name: 'whitespace incidentId', input: validInput({ incidentId: '   ' }), error: CallValidationError },
    { name: 'empty contactId', input: validInput({ authorizedContactId: '' }), error: CallValidationError },
    { name: 'empty purpose', input: validInput({ purpose: '' }), error: CallValidationError },
    { name: 'empty idempotencyKey', input: validInput({ idempotencyKey: '' }), error: CallValidationError },
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
});
