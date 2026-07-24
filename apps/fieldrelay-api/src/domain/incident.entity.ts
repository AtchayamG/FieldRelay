// Incident aggregate. No framework, transport, or persistence imports: this
// file owns the business invariants and nothing else.

export type IncidentType =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'other';

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'intake'
  | 'triage'
  | 'calling'
  | 'awaiting_approval'
  | 'dispatched'
  | 'resolved'
  | 'cancelled';

export const INCIDENT_TYPES: readonly IncidentType[] = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'other'
];

export const INCIDENT_PRIORITIES: readonly IncidentPriority[] = [
  'critical',
  'high',
  'medium',
  'low'
];

// Field bounds live with the aggregate so every entry point (HTTP, seed data,
// a future importer) is constrained identically.
export const MAX_PROPERTY_ID_LENGTH = 64;
export const MAX_UNIT_LENGTH = 32;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_REPORTED_BY_LENGTH = 128;

// The lifecycle from blueprint doc 06 section 3, reduced to the states this
// service can actually reach. A transition absent from this table is illegal.
const ALLOWED_TRANSITIONS: Readonly<Record<IncidentStatus, readonly IncidentStatus[]>> = {
  intake: ['triage', 'cancelled'],
  triage: ['calling', 'awaiting_approval', 'dispatched', 'cancelled'],
  calling: ['awaiting_approval', 'dispatched', 'triage', 'cancelled'],
  awaiting_approval: ['dispatched', 'triage', 'cancelled'],
  dispatched: ['resolved', 'triage', 'cancelled'],
  resolved: [],
  cancelled: []
};

export class IncidentInvariantError extends Error {}

export interface IncidentProps {
  id: string;
  displayId: string;
  propertyId: string;
  unit: string | null;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  description: string;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Incident {
  private constructor(private readonly props: IncidentProps) {}

  public get id(): string {
    return this.props.id;
  }
  public get displayId(): string {
    return this.props.displayId;
  }
  public get propertyId(): string {
    return this.props.propertyId;
  }
  public get unit(): string | null {
    return this.props.unit;
  }
  public get type(): IncidentType {
    return this.props.type;
  }
  public get priority(): IncidentPriority {
    return this.props.priority;
  }
  public get status(): IncidentStatus {
    return this.props.status;
  }
  public get description(): string {
    return this.props.description;
  }
  public get reportedBy(): string {
    return this.props.reportedBy;
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
    propertyId: string;
    unit?: string | null;
    type: IncidentType;
    priority: IncidentPriority;
    description: string;
    reportedBy: string;
    createdAt: Date;
  }): Incident {
    const propertyId = requireBoundedText(
      props.propertyId,
      'propertyId',
      MAX_PROPERTY_ID_LENGTH
    );
    const description = requireBoundedText(
      props.description,
      'description',
      MAX_DESCRIPTION_LENGTH
    );
    const reportedBy = requireBoundedText(
      props.reportedBy,
      'reportedBy',
      MAX_REPORTED_BY_LENGTH
    );
    const unit = optionalBoundedText(props.unit, 'unit', MAX_UNIT_LENGTH);

    if (!INCIDENT_TYPES.includes(props.type)) {
      throw new IncidentInvariantError(
        `type must be one of: ${INCIDENT_TYPES.join(', ')}`
      );
    }
    if (!INCIDENT_PRIORITIES.includes(props.priority)) {
      throw new IncidentInvariantError(
        `priority must be one of: ${INCIDENT_PRIORITIES.join(', ')}`
      );
    }

    return new Incident({
      id: props.id,
      displayId: props.displayId,
      propertyId,
      unit,
      type: props.type,
      priority: props.priority,
      // Every incident enters the lifecycle at intake; triage decides the rest.
      status: 'intake',
      description,
      reportedBy,
      createdAt: props.createdAt,
      updatedAt: props.createdAt,
      version: 1
    });
  }

  // Rebuilds an aggregate already validated on the way in. Persistence adapters
  // use this; it deliberately skips create-time normalization so a stored row
  // round-trips unchanged.
  public static rehydrate(props: IncidentProps): Incident {
    return new Incident({ ...props });
  }

  public transitionTo(next: IncidentStatus, at: Date): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(next)) {
      throw new IncidentInvariantError(
        `Cannot move incident from ${this.props.status} to ${next}`
      );
    }
    this.props.status = next;
    this.props.updatedAt = at;
    this.props.version += 1;
  }

  public toProps(): IncidentProps {
    return { ...this.props };
  }
}

function requireBoundedText(value: string, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new IncidentInvariantError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new IncidentInvariantError(`${field} must be at most ${max} characters`);
  }
  return trimmed;
}

function optionalBoundedText(
  value: string | null | undefined,
  field: string,
  max: number
): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }
  return requireBoundedText(value, field, max);
}
