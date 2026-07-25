import { createHash, timingSafeEqual } from 'node:crypto';
import { AuthenticationError } from './errors';
import {
  DEFAULT_SESSION_TTL_SECONDS,
  SessionClaims,
  signSession
} from './session-token';

export interface DemoCredentials {
  email: string;
  password: string;
}

export interface IssueSessionInput {
  email: string;
  password: string;
}

export interface IssueSessionOutput {
  token: string;
  expiresAt: string;
  subject: string;
  role: 'operator';
  demo: true;
}

// The evaluator credentials are published on the sign-in screen and in the
// README on purpose: judges must be able to get in without being given a
// secret out of band. That makes this a *boundary*, not an identity system —
// its job is to ensure no route mutates state for an anonymous caller, and to
// give the deployment one place to enforce a session. Real identity, roles and
// per-tenant isolation are separate work (security doc 08).
//
// What actually protects the call budget on a public deployment is CALL_E_MODE,
// which keeps the judge environment incapable of dialling regardless of who
// signs in.
export class IssueSessionUseCase {
  constructor(
    private readonly credentials: DemoCredentials,
    private readonly signingSecret: string,
    private readonly ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS
  ) {}

  public execute(input: IssueSessionInput, now = new Date()): IssueSessionOutput {
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';

    // Both comparisons run regardless of whether the first one failed, and both
    // are constant time, so response timing does not reveal whether the email
    // was the valid one.
    const emailOk = constantTimeEquals(email, this.credentials.email.trim().toLowerCase());
    const passwordOk = constantTimeEquals(password, this.credentials.password);
    if (!emailOk || !passwordOk) {
      throw new AuthenticationError('Invalid credentials');
    }

    const issuedAt = Math.floor(now.getTime() / 1000);
    const claims: SessionClaims = {
      sub: this.credentials.email,
      role: 'operator',
      iat: issuedAt,
      exp: issuedAt + this.ttlSeconds,
      demo: true
    };

    return {
      token: signSession(claims, this.signingSecret),
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      subject: claims.sub,
      role: 'operator',
      demo: true
    };
  }
}

// Hashing first makes the comparison independent of input length, so a
// mismatched length cannot short-circuit and leak information.
function constantTimeEquals(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}
