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

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
