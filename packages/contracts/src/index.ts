// Purposes CALL-E may be asked to pursue. Authorization to use a purpose is
// granted per-contact (see security doc 08, section 4), not globally.
export type CallPurpose = 'vendor_availability' | 'appointment_confirmation' | 'status_update';

// Strict lifecycle union shared by the domain, the provider port and the API.
export type CallStatus =
  | 'draft'
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer';

// Statuses a provider (real or demo) may report back after startCall.
export type ProviderCallStatus = Exclude<CallStatus, 'draft'>;

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
  providerTaskId: string;
  status: ProviderCallStatus;
  // true when produced by the demo adapter rather than a live call.
  simulated: boolean;
  startedAt?: string;
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
