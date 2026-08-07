import type { CallPurpose } from '../domain/call-task.entity';

export const CONTACT_AUTH_PORT = Symbol('CONTACT_AUTH_PORT');

// The repository boundary that resolves an authorized contact identifier. The
// raw phone number lives behind this boundary and is never returned to the
// interface layer (security doc 08, sections 4 and 6).
export interface AuthorizedContact {
  contactId: string;
  authorizationStatus: 'authorized' | 'revoked' | 'pending';
  allowedPurposes: readonly CallPurpose[];
}

export interface ContactAuthorizationPort {
  resolve(contactId: string): Promise<AuthorizedContact | null>;
  // Reading the whole list is what makes the authorization boundary visible to
  // an operator instead of buried in configuration. It returns identifiers and
  // decisions only — the phone number stays behind this boundary, as it does
  // for resolve().
  list(): Promise<AuthorizedContact[]>;
}
