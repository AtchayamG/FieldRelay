export const DIAL_TARGET_PORT = Symbol('DIAL_TARGET_PORT');

// The only place a real phone number is allowed to surface, and it is resolved
// inside infrastructure immediately before provider I/O. Nothing on this type is
// ever persisted, logged, returned from an API, or passed back into the
// application layer (security doc 08, sections 4 and 6).
export interface DialTarget {
  // E.164, e.g. +6512345678.
  phoneE164: string;
  // CALL-E recipient region code, e.g. US, SG, IN.
  region: string;
  // BCP-47 locale, e.g. en-US.
  locale: string;
}

export interface DialTargetResolverPort {
  resolve(contactId: string): Promise<DialTarget | null>;
}
