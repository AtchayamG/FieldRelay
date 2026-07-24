export type CallPurpose =
  | 'vendor_availability'
  | 'appointment_confirmation'
  | 'status_update';

export type ProviderCallStatus =
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer';

export type CallStatus = ProviderCallStatus | 'outcome_unknown';
export type CallFailureCode = 'provider_unavailable';

export interface CallTaskProps {
  id: string;
  displayId: string;
  incidentId: string;
  provider: string;
  providerTaskId: string | null;
  purpose: CallPurpose;
  authorizedContactId: string;
  status: CallStatus;
  simulated: boolean;
  failureCode: CallFailureCode | null;
  timeoutSeconds: number;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class CallTask {
  private constructor(private readonly props: CallTaskProps) {}

  public get id(): string {
    return this.props.id;
  }

  public get displayId(): string {
    return this.props.displayId;
  }

  public get incidentId(): string {
    return this.props.incidentId;
  }

  public get provider(): string {
    return this.props.provider;
  }

  public get providerTaskId(): string | null {
    return this.props.providerTaskId;
  }

  public get purpose(): CallPurpose {
    return this.props.purpose;
  }

  public get authorizedContactId(): string {
    return this.props.authorizedContactId;
  }

  public get status(): CallStatus {
    return this.props.status;
  }

  public get simulated(): boolean {
    return this.props.simulated;
  }

  public get failureCode(): CallFailureCode | null {
    return this.props.failureCode;
  }

  public get timeoutSeconds(): number {
    return this.props.timeoutSeconds;
  }

  public get retries(): number {
    return this.props.retries;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get version(): number {
    return this.props.version;
  }

  public static create(props: {
    id: string;
    displayId: string;
    incidentId: string;
    provider: string;
    purpose: CallPurpose;
    authorizedContactId: string;
    simulated: boolean;
    timeoutSeconds: number;
    retries: number;
    createdAt: Date;
  }): CallTask {
    requireText(props.id, 'id', 64);
    requireText(props.displayId, 'displayId', 64);
    requireText(props.incidentId, 'incidentId', 64);
    requireText(props.provider, 'provider', 64);
    requireText(props.authorizedContactId, 'authorizedContactId', 64);
    if (!Number.isInteger(props.timeoutSeconds) || props.timeoutSeconds <= 0) {
      throw new Error('timeoutSeconds must be a positive integer');
    }
    if (!Number.isInteger(props.retries) || props.retries < 0) {
      throw new Error('retries must be a non-negative integer');
    }

    return new CallTask({
      ...props,
      providerTaskId: null,
      status: 'queued',
      failureCode: null,
      updatedAt: props.createdAt,
      version: 1
    });
  }

  public static rehydrate(props: CallTaskProps): CallTask {
    return new CallTask({ ...props });
  }

  public recordProviderResult(result: {
    providerTaskId: string;
    status: ProviderCallStatus;
    simulated: boolean;
    at: Date;
  }): void {
    requireText(result.providerTaskId, 'providerTaskId', 128);
    this.props.providerTaskId = result.providerTaskId;
    this.props.status = result.status;
    this.props.simulated = result.simulated;
    this.props.failureCode = null;
    this.touch(result.at);
  }

  public markOutcomeUnknown(at: Date): void {
    this.props.status = 'outcome_unknown';
    this.props.failureCode = 'provider_unavailable';
    this.touch(at);
  }

  public toProps(): CallTaskProps {
    return { ...this.props };
  }

  private touch(at: Date): void {
    this.props.updatedAt = at;
    this.props.version += 1;
  }
}

function requireText(value: string, field: string, maxLength: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  if (value.length > maxLength) {
    throw new Error(`${field} must be at most ${maxLength} characters`);
  }
}
