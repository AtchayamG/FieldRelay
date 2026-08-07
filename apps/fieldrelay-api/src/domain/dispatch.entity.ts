// A dispatch is the commitment itself: a vendor is now expected to attend a
// property at a stated time, and money will be owed for it.
//
// Everything before this point in FieldRelay is reversible. A call can be
// abandoned, an outcome can fail validation, an approval can be rejected. A
// dispatch cannot be un-sent, which is why it is the most heavily guarded
// object in the domain and why it can only ever come from an approved approval.

export type DispatchStatus = 'scheduled' | 'en_route' | 'on_site' | 'completed' | 'cancelled';

export class DispatchInvariantError extends Error {}

// Terminal states cannot transition further. A completed job that later gets
// marked en_route is a data-entry error, not a state change.
const ALLOWED_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  scheduled: ['en_route', 'cancelled'],
  en_route: ['on_site', 'cancelled'],
  on_site: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

export interface DispatchProps {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  // The approval that authorised this. Not nullable: a dispatch without one
  // cannot exist, and the column carries a unique constraint so one approval
  // can only ever produce one dispatch.
  approvalId: string;
  contactId: string;
  status: DispatchStatus;
  // What the vendor said on the call, carried forward verbatim. Never parsed
  // into a number — "$35, more if the valve is seized" has no correct numeric
  // reading, and inventing one would commit the operator to a figure nobody
  // agreed to.
  quotedAmountText: string | null;
  scheduledFor: Date | null;
  // Who released it. Taken from the signed session, never from a request body.
  dispatchedBy: string;
  dispatchedAt: Date;
  cancelledReason: string | null;
  version: number;
}

export class Dispatch {
  private constructor(private readonly props: DispatchProps) {}

  public get id(): string {
    return this.props.id;
  }
  public get displayId(): string {
    return this.props.displayId;
  }
  public get incidentId(): string {
    return this.props.incidentId;
  }
  public get callTaskId(): string {
    return this.props.callTaskId;
  }
  public get approvalId(): string {
    return this.props.approvalId;
  }
  public get contactId(): string {
    return this.props.contactId;
  }
  public get status(): DispatchStatus {
    return this.props.status;
  }
  public get quotedAmountText(): string | null {
    return this.props.quotedAmountText;
  }
  public get scheduledFor(): Date | null {
    return this.props.scheduledFor;
  }
  public get dispatchedBy(): string {
    return this.props.dispatchedBy;
  }
  public get dispatchedAt(): Date {
    return this.props.dispatchedAt;
  }
  public get cancelledReason(): string | null {
    return this.props.cancelledReason;
  }
  public get version(): number {
    return this.props.version;
  }

  public static create(props: {
    id: string;
    displayId: string;
    incidentId: string;
    callTaskId: string;
    approvalId: string;
    contactId: string;
    quotedAmountText: string | null;
    scheduledFor: Date | null;
    dispatchedBy: string;
    dispatchedAt: Date;
    // The status of the approval as it stands right now. Passed in rather than
    // trusted from the caller's memory, so the check happens against the row.
    approvalStatus: string;
  }): Dispatch {
    // The refusal this entity exists for. A pending approval means nobody has
    // decided; a rejected one means somebody decided no. Neither authorises
    // spending money, and both have been "helpfully" ignored by systems before.
    if (props.approvalStatus !== 'approved') {
      throw new DispatchInvariantError(
        `Cannot dispatch against an approval that is ${props.approvalStatus}. Only an approved decision authorises a vendor to attend.`
      );
    }
    if (!props.dispatchedBy || props.dispatchedBy.trim().length === 0) {
      throw new DispatchInvariantError('A dispatch must record who released it');
    }
    if (!props.contactId || props.contactId.trim().length === 0) {
      throw new DispatchInvariantError('A dispatch must name the vendor being sent');
    }

    return new Dispatch({
      ...props,
      status: 'scheduled',
      cancelledReason: null,
      version: 1
    });
  }

  public static rehydrate(props: DispatchProps): Dispatch {
    return new Dispatch({ ...props });
  }

  public advance(input: {
    to: DispatchStatus;
    at: Date;
    reason?: string | null;
  }): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(input.to)) {
      throw new DispatchInvariantError(
        `A dispatch that is ${this.props.status} cannot become ${input.to}.` +
          (allowed.length === 0
            ? ' It has reached a terminal state.'
            : ` Allowed next: ${allowed.join(', ')}.`)
      );
    }
    if (input.to === 'cancelled') {
      const reason = (input.reason ?? '').trim();
      if (reason.length === 0) {
        // A cancelled job means somebody was told not to come. That has a cost
        // and a reason, and the reason is the useful part of the record.
        throw new DispatchInvariantError('Cancelling a dispatch must record why');
      }
      if (reason.length > 500) {
        throw new DispatchInvariantError('cancelledReason must be at most 500 characters');
      }
      this.props.cancelledReason = reason;
    }

    this.props.status = input.to;
    this.props.version += 1;
    void input.at;
  }

  public toProps(): DispatchProps {
    return { ...this.props };
  }
}
