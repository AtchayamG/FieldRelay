import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthenticationError, CallProviderConfigurationError } from './errors';

// A deliberately small signed-token implementation rather than a JWT library.
// The token carries three claims and nothing else, is signed with HMAC-SHA256,
// and is verified in constant time. No dependency is added for what is a dozen
// lines of well-understood cryptography, and there is no algorithm field for an
// attacker to downgrade to "none".
//
// Format: v1.<base64url(payload JSON)>.<hex HMAC of the first two segments>

const VERSION = 'v1';
const MIN_SECRET_LENGTH = 32;
export const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;

export type SessionRole = 'operator';

export interface SessionClaims {
  // Subject: the demo operator's email.
  sub: string;
  role: SessionRole;
  // Seconds since the epoch.
  iat: number;
  exp: number;
  // Always true in this build. Present so a future real session is
  // distinguishable from a demo one at every layer that reads the token.
  demo: boolean;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='), 'base64');
}

export function requireSigningSecret(secret: string | undefined): string {
  const clean = (secret ?? '').trim();
  if (clean.length < MIN_SECRET_LENGTH) {
    throw new CallProviderConfigurationError(
      `AUTH_SIGNING_SECRET is required and must be at least ${MIN_SECRET_LENGTH} characters`
    );
  }
  return clean;
}

export function signSession(claims: SessionClaims, secret: string): string {
  const body = `${VERSION}.${base64url(JSON.stringify(claims))}`;
  const signature = createHmac('sha256', requireSigningSecret(secret)).update(body).digest('hex');
  return `${body}.${signature}`;
}

// Throws AuthenticationError for every rejection reason, with a message that
// never distinguishes "bad signature" from "expired" in a way that helps an
// attacker probe, while still being useful in a log.
export function verifySession(token: string, secret: string, now = new Date()): SessionClaims {
  const clean = (token ?? '').trim();
  const segments = clean.split('.');
  if (segments.length !== 3 || segments[0] !== VERSION) {
    throw new AuthenticationError('Malformed session token');
  }

  const body = `${segments[0]}.${segments[1]}`;
  const expected = createHmac('sha256', requireSigningSecret(secret)).update(body).digest('hex');
  const presented = segments[2].toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(presented)) {
    throw new AuthenticationError('Malformed session token');
  }
  const presentedBuf = Buffer.from(presented, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (presentedBuf.length !== expectedBuf.length || !timingSafeEqual(presentedBuf, expectedBuf)) {
    throw new AuthenticationError('Invalid session token');
  }

  let claims: SessionClaims;
  try {
    claims = JSON.parse(fromBase64url(segments[1]).toString('utf8')) as SessionClaims;
  } catch {
    throw new AuthenticationError('Malformed session token');
  }

  if (
    typeof claims.sub !== 'string' ||
    claims.sub.length === 0 ||
    claims.role !== 'operator' ||
    !Number.isInteger(claims.exp) ||
    !Number.isInteger(claims.iat)
  ) {
    throw new AuthenticationError('Malformed session token');
  }

  if (Math.floor(now.getTime() / 1000) >= claims.exp) {
    throw new AuthenticationError('Session token has expired');
  }

  return claims;
}
