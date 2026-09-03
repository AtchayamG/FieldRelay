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

// The answer a completed call produced, after validation against the schema
// FieldRelay declared when placing it. No transcript, recording, summary or
// phone number: a decision rests on the validated fields, not on prose from a
// telephone conversation.
export interface CallOutcome {
  structuredResult: Record<string, unknown>;
  taskCompleted: boolean;
  confidenceScore: number | null;
  confidenceLabel: string | null;
  // True when the answer did not satisfy the declared schema. Shown rather than
  // hidden: a call that connected and produced nothing usable is a fact the
  // operator needs.
  validationFailed: boolean;
  receivedAt: string;
}

export interface CallTaskDetail extends CallTask {
  outcome: CallOutcome | null;
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

export interface StartCallCommand {
  incidentId: string;
  authorizedContactId: string;
  purpose: 'vendor_availability';
  timeoutSeconds: number;
  retries: number;
}

export interface StartedCall {
  callTaskId: string;
  displayId: string;
  providerTaskId: string;
  status: CallStatus;
  simulated: boolean;
}

export interface CallLaunchContext {
  mode: 'demo' | 'live';
  configured: boolean;
  contactId: string | null;
  maskedPhone: string | null;
}
