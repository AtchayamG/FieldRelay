export type CallPurpose =
  | 'vendor_availability'
  | 'appointment_confirmation'
  | 'status_update';

export type CallStatus =
  | 'draft'
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer';

export class CallTask {
  private constructor(
    public readonly id: string,
    public readonly incidentId: string,
    public readonly authorizedContactId: string,
    public readonly purpose: CallPurpose,
    public status: CallStatus,
    public readonly timeoutSeconds: number,
    public readonly retries: number,
    public readonly idempotencyKey: string
  ) {}

  public static create(props: {
    id: string;
    incidentId: string;
    authorizedContactId: string;
    purpose: CallPurpose;
    timeoutSeconds: number;
    retries: number;
    idempotencyKey: string;
  }): CallTask {
    if (!props.incidentId) throw new Error('Incident ID is required');
    if (!props.authorizedContactId) throw new Error('Authorized Contact ID is required');
    if (!props.purpose) throw new Error('Purpose is required');
    if (!props.idempotencyKey) throw new Error('Idempotency key is required');

    return new CallTask(
      props.id,
      props.incidentId,
      props.authorizedContactId,
      props.purpose,
      'draft',
      props.timeoutSeconds,
      props.retries,
      props.idempotencyKey
    );
  }

  public queue(): void {
    if (this.status !== 'draft') {
      throw new Error(`Cannot queue call task from status ${this.status}`);
    }
    this.status = 'queued';
  }
}
