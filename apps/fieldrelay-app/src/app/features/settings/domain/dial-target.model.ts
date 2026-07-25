export interface DialTargetSettings {
  configured: boolean;
  contactId: string | null;
  // The API never returns a full number; only its last four digits.
  maskedPhone: string | null;
  region: string | null;
  locale: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  // False when the deployment forbids changing the number from inside the app,
  // in which case the form must be presented read-only rather than offering a
  // save that will be refused.
  runtimeChangesAllowed: boolean;
  supportedRegions: readonly string[];
}

export interface SetDialTargetParams {
  contactId: string;
  phoneE164: string;
  region: string;
  locale: string;
}
