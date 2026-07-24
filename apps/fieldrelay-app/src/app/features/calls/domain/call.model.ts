export type CallStatus =
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer'
  | 'outcome_unknown';

export interface CallTask {
  id: string;
  displayId: string;
  incidentId: string;
  providerTaskId: string | null;
  purpose: string;
  authorizedContactId: string;
  status: CallStatus;
  simulated: boolean;
  timeoutSeconds: number;
  retries: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CallListResult {
  items: CallTask[];
  nextCursor: string | null;
}

export interface ListCallsQuery {
  status?: CallStatus;
  incidentId?: string;
  cursor?: string;
  limit?: number;
}
