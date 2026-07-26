export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Why a human was asked. Stored on the approval so the queue can explain itself
// and so changing the policy later does not rewrite why past decisions were
// required.
export type ApprovalReason =
  | 'cost_commitment'
  | 'low_confidence'
  | 'incomplete_answer'
  | 'task_not_completed';

export class ApprovalInvariantError extends Error {}

export interface ApprovalProps {
  id: string;
  displayId: string;
  incidentId: string;
  callTaskId: string;
  status: ApprovalStatus;
  reasons: ApprovalReason[];
  // The outcome timestamp this approval was raised against.
  outcomeReceivedAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  version: number;
}

export class Approval {
  private constructor(private readonly props: ApprovalProps) {}

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
  public get status(): ApprovalStatus {
    return this.props.status;
  }
  public get reasons(): ApprovalReason[] {
    return [...this.props.reasons];
  }
  public get outcomeReceivedAt(): Date {
    return this.props.outcomeReceivedAt;
  }
  public get decidedBy(): string | null {
    return this.props.decidedBy;
  }
  public get decidedAt(): Date | null {
    return this.props.decidedAt;
  }
  public get decisionNote(): string | null {
    return this.props.decisionNote;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get version(): number {
    return this.props.version;
  }

  public static create(props: {
    id: string;
    displayId: string;
    incidentId: string;
    callTaskId: string;
    reasons: ApprovalReason[];
    outcomeReceivedAt: Date;
    createdAt: Date;
  }): Approval {
    if (props.reasons.length === 0) {
      // An approval with no reason cannot be explained to the person being
      // asked, so it must not exist.
      throw new ApprovalInvariantError('An approval must record why it was required');
    }
    return new Approval({
      ...props,
      reasons: [...props.reasons],
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
      version: 1
    });
  }

  public static rehydrate(props: ApprovalProps): Approval {
    return new Approval({ ...props, reasons: [...props.reasons] });
  }

  // Applying a decision to an already-decided approval is refused rather than
  // overwritten: the first decision is the accountable one, and a silent
  // overwrite would erase who committed to what.
  public decide(input: {
    status: Exclude<ApprovalStatus, 'pending'>;
    decidedBy: string;
    decisionNote: string | null;
    at: Date;
    // The outcome timestamp as it stands now. If it moved since this approval
    // was raised, the approver would be deciding on an answer they never saw.
    currentOutcomeReceivedAt: Date;
  }): void {
    if (this.props.status !== 'pending') {
      throw new ApprovalInvariantError(
        `Approval ${this.props.displayId} was already ${this.props.status}`
      );
    }
    if (input.currentOutcomeReceivedAt.getTime() !== this.props.outcomeReceivedAt.getTime()) {
      throw new ApprovalInvariantError(
        'The call outcome changed after this approval was raised. Review the updated answer and decide again.'
      );
    }
    if (!input.decidedBy || input.decidedBy.trim().length === 0) {
      throw new ApprovalInvariantError('A decision must record who made it');
    }
    if (input.decisionNote !== null && input.decisionNote.length > 500) {
      throw new ApprovalInvariantError('decisionNote must be at most 500 characters');
    }

    this.props.status = input.status;
    this.props.decidedBy = input.decidedBy;
    this.props.decisionNote = input.decisionNote;
    this.props.decidedAt = input.at;
    this.props.version += 1;
  }

  public toProps(): ApprovalProps {
    return { ...this.props, reasons: [...this.props.reasons] };
  }
}
