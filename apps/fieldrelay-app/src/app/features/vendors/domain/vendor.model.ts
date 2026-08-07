export type CallPurpose = 'vendor_availability' | 'appointment_confirmation' | 'status_update';
export type AuthorizationStatus = 'authorized' | 'revoked' | 'pending';

export interface Vendor {
  contactId: string;
  authorizationStatus: AuthorizationStatus;
  allowedPurposes: CallPurpose[];
  refusedPurposes: CallPurpose[];
  // A boolean, never a number. The API does not return the digits and this
  // model has nowhere to put them.
  numberProvisioned: boolean;
  callable: boolean;
}

export interface VendorListResult {
  items: Vendor[];
  callableCount: number;
  totalCount: number;
}

export const PURPOSE_LABEL: Record<CallPurpose, string> = {
  vendor_availability: 'Vendor availability',
  appointment_confirmation: 'Appointment confirmation',
  status_update: 'Status update'
};

export const STATUS_LABEL: Record<AuthorizationStatus, string> = {
  authorized: 'Authorized',
  revoked: 'Revoked',
  pending: 'Pending'
};

// Why a given contact cannot be called, in the order the system checks it.
// Returns null when it can. Written as a single ordered list because "revoked
// AND no number" should report the first, decisive reason rather than both.
export function refusalReason(vendor: Vendor): string | null {
  if (vendor.authorizationStatus === 'revoked') {
    return 'Authorization was revoked. FieldRelay will not call this contact for any purpose.';
  }
  if (vendor.authorizationStatus === 'pending') {
    return 'Authorization has not been granted yet. Consent is recorded outside this application.';
  }
  if (vendor.allowedPurposes.length === 0) {
    return 'Authorized, but cleared for no call purpose.';
  }
  if (!vendor.numberProvisioned) {
    return 'No number is provisioned for this contact. An authorized contact with no number still reaches nobody.';
  }
  return null;
}
