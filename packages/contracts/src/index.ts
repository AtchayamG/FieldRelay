// Purposes CALL-E may be asked to pursue. Authorization to use a purpose is
// granted per-contact (see security doc 08, section 4), not globally.
export type CallPurpose = 'vendor_availability' | 'appointment_confirmation' | 'status_update';

// Strict lifecycle union shared by the domain, the provider port and the API.
export type CallStatus =
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer'
  | 'outcome_unknown';

// Statuses a provider (real or demo) may report back after startCall.
export type ProviderCallStatus = Exclude<CallStatus, 'outcome_unknown'>;

export interface StartCallRequestDto {
  incidentId: string;
  // An authorized contact identifier only. A raw phone number is never accepted
  // at this boundary; the number is resolved behind the repository boundary.
  authorizedContactId: string;
  purpose: string;
  timeoutSeconds?: number;
  retries?: number;
}

export interface CallStatusResponseDto {
  callTaskId: string;
  displayId: string;
  providerTaskId: string;
  status: CallStatus;
  // true when produced by the demo adapter rather than a live call.
  simulated: boolean;
  startedAt?: string;
}

export interface CallTaskResponseDto {
  id: string;
  displayId: string;
  incidentId: string;
  providerTaskId: string | null;
  purpose: CallPurpose;
  authorizedContactId: string;
  status: CallStatus;
  simulated: boolean;
  timeoutSeconds: number;
  retries: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CallListDto {
  items: CallTaskResponseDto[];
  nextCursor: string | null;
}

// The answer a completed call produced, after validation against the schema
// FieldRelay declared when it placed the call.
//
// Note what is absent: no transcript, no recording, no free-text summary and no
// phone number. An approval decision rests on the schema-validated fields, not
// on prose from a telephone conversation (security doc 08).
export interface CallOutcomeDto {
  // Keyed exactly as the purpose's declared result schema. Undeclared keys the
  // provider volunteered were dropped, not stored.
  structuredResult: Record<string, unknown>;
  // CALL-E's judgment that the goal was achieved. Distinct from the call having
  // connected: a call can complete while the task fails.
  taskCompleted: boolean;
  confidenceScore: number | null;
  confidenceLabel: string | null;
  // True when the answer did not satisfy the declared schema. The outcome is
  // still shown, because a call that connected and produced nothing usable is
  // something an operator must see rather than be shielded from.
  validationFailed: boolean;
  receivedAt: string;
}

export interface CallTaskDetailDto extends CallTaskResponseDto {
  // Null until a terminal webhook delivers an answer.
  outcome: CallOutcomeDto | null;
}

export interface ReconcileCallResponseDto {
  status: CallStatus;
  applied: boolean;
}

// --- Incidents -------------------------------------------------------------

export type IncidentType =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'other';

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

// Explicit operational lifecycle. Every incident is in exactly one of these
// states; there is no implicit "unknown" state (blueprint doc 06, section 3).
export type IncidentStatus =
  | 'intake'
  | 'triage'
  | 'calling'
  | 'awaiting_approval'
  | 'dispatched'
  | 'resolved'
  | 'cancelled';

export interface CreateIncidentRequestDto {
  propertyId: string;
  unit?: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  reportedBy: string;
}

export interface IncidentResponseDto {
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

export interface IncidentListDto {
  items: IncidentResponseDto[];
  // Opaque keyset cursor for the next page; null when the list is exhausted.
  nextCursor: string | null;
}

// --- Envelopes -------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

// Stable machine-readable error codes. Clients branch on `code`, never on the
// human-readable `message`.
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_AUTHORIZED'
  | 'NOT_FOUND'
  | 'IDEMPOTENCY_KEY_MISMATCH'
  | 'OPERATION_IN_PROGRESS'
  | 'INTERNAL_ERROR';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

// --- Provider Callbacks ---------------------------------------------------

export type AllowedCallbackStatus = 'ringing' | 'connected' | 'completed' | 'failed' | 'no_answer';

export interface ProviderCallbackRequestDto {
  eventId: string;
  providerTaskId: string;
  status: AllowedCallbackStatus;
}

export interface ProviderCallbackAcceptedResponseDto {
  accepted: boolean;
  eventId: string;
}
