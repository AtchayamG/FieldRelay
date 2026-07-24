import { randomUUID } from 'node:crypto';
import { CallPurpose, CallTask } from '../domain/call-task.entity';
import { CallEPort, CallEResult } from './call-e.port';
import { ContactAuthorizationPort } from './contact-authorization.port';
import { CallAuthorizationError, CallValidationError } from './errors';

// Bounds enforced before any provider is invoked. Kept small and explicit
// rather than configurable — a single demo slice needs no tuning surface.
export const MIN_TIMEOUT_SECONDS = 30;
export const MAX_TIMEOUT_SECONDS = 900;
export const DEFAULT_TIMEOUT_SECONDS = 300;
export const MAX_RETRIES = 3;

export interface StartCallInput {
  incidentId: string;
  authorizedContactId: string;
  purpose: string;
  idempotencyKey: string;
  timeoutSeconds?: number;
  retries?: number;
}

export interface StartCallOutput {
  callTaskId: string;
  providerTaskId: string;
  status: CallEResult['status'];
  simulated: boolean;
}

// Plain class — no Nest decorators. Dependencies are injected by the module via
// a factory so the application layer never imports the framework.
export class StartCallUseCase {
  constructor(
    private readonly callEPort: CallEPort,
    private readonly contacts: ContactAuthorizationPort
  ) {}

  public async execute(input: StartCallInput): Promise<StartCallOutput> {
    const timeoutSeconds = input.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const retries = input.retries ?? 0;

    // --- Input guards (all must pass before the provider is touched) ---
    this.requireNonEmpty(input.incidentId, 'incidentId is required');
    this.requireNonEmpty(input.authorizedContactId, 'authorizedContactId is required');
    this.requireNonEmpty(input.purpose, 'purpose is required');
    this.requireNonEmpty(input.idempotencyKey, 'Idempotency-Key is required');
    this.requireBoundedInt(
      timeoutSeconds,
      MIN_TIMEOUT_SECONDS,
      MAX_TIMEOUT_SECONDS,
      'timeoutSeconds'
    );
    this.requireBoundedInt(retries, 0, MAX_RETRIES, 'retries');

    // --- Authorization guard: resolve the contact behind the repository
    // boundary and confirm it is authorized for this specific purpose. ---
    const contact = await this.contacts.resolve(input.authorizedContactId);
    if (!contact || contact.authorizationStatus !== 'authorized') {
      throw new CallAuthorizationError('Contact is not authorized to be called');
    }
    if (!contact.allowedPurposes.includes(input.purpose as CallPurpose)) {
      throw new CallAuthorizationError(`Purpose "${input.purpose}" is not permitted for this contact`);
    }

    const callTask = CallTask.create({
      id: `CALL-E-${randomUUID()}`,
      incidentId: input.incidentId,
      authorizedContactId: input.authorizedContactId,
      purpose: input.purpose as CallPurpose,
      idempotencyKey: input.idempotencyKey,
      timeoutSeconds,
      retries
    });
    callTask.queue();

    // ponytail: no persistence — the CallTask is not saved. Add a repository
    // here when a workflow needs to survive process restarts.
    const result = await this.callEPort.startCall(callTask);

    return {
      callTaskId: callTask.id,
      providerTaskId: result.providerTaskId,
      status: result.status,
      simulated: result.simulated
    };
  }

  private requireNonEmpty(value: string, message: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new CallValidationError(message);
    }
  }

  private requireBoundedInt(value: number, min: number, max: number, field: string): void {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new CallValidationError(`${field} must be an integer between ${min} and ${max}`);
    }
  }
}
