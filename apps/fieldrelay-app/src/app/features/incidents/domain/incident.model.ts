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

export interface Incident {
  id: string;
  displayId: string;
  propertyId: string;
  unit: string | null;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  description: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface IncidentListResult {
  items: Incident[];
  nextCursor: string | null;
}

export interface CreateIncidentParams {
  propertyId: string;
  unit?: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  reportedBy: string;
}

export interface ListIncidentsQuery {
  status?: IncidentStatus;
  cursor?: string;
  limit?: number;
}
