import { AuthenticationError, CallProviderConfigurationError } from '../application/errors';
import { IssueSessionUseCase } from '../application/issue-session.use-case';
import {
  DEFAULT_SESSION_TTL_SECONDS,
  requireSigningSecret,
  signSession,
  verifySession
} from '../application/session-token';

const SECRET = 'a-signing-secret-of-at-least-32-characters';
const OTHER_SECRET = 'a-different-secret-of-at-least-32-chars!!';
const CREDENTIALS = { email: 'ops.demo@fieldrelay.io', password: 'DemoOps2026!' };

describe('session tokens', () => {
  const claims = {
    sub: 'ops.demo@fieldrelay.io',
    role: 'operator' as const,
    iat: 1_800_000_000,
    exp: 1_800_003_600,
    demo: true
  };

  it('round-trips claims through sign and verify', () => {
    const token = signSession(claims, SECRET);
    expect(verifySession(token, SECRET, new Date(1_800_000_100_000))).toEqual(claims);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSession(claims, OTHER_SECRET);
    expect(() => verifySession(token, SECRET, new Date(1_800_000_100_000))).toThrow(
      AuthenticationError
    );
  });

  it('rejects a tampered payload', () => {
    const token = signSession(claims, SECRET);
    const [version, payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'admin' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(() => verifySession(`${version}.${forged}.${signature}`, SECRET)).toThrow(
      AuthenticationError
    );
    expect(payload).not.toBe(forged);
  });

  it('rejects an expired token', () => {
    const token = signSession(claims, SECRET);
    expect(() => verifySession(token, SECRET, new Date(1_800_003_601_000))).toThrow(
      'Session token has expired'
    );
  });

  it.each([
    ['an empty string', ''],
    ['a bare word', 'nonsense'],
    ['the wrong version', 'v2.abc.def'],
    ['a non-hex signature', 'v1.abc.zzzz'],
    ['a missing segment', 'v1.abc']
  ])('rejects %s', (_label, token) => {
    expect(() => verifySession(token, SECRET)).toThrow(AuthenticationError);
  });

  it('refuses to sign or verify with a weak secret', () => {
    expect(() => requireSigningSecret('short')).toThrow(CallProviderConfigurationError);
    expect(() => requireSigningSecret(undefined)).toThrow(CallProviderConfigurationError);
  });
});

describe('IssueSessionUseCase', () => {
  const useCase = new IssueSessionUseCase(CREDENTIALS, SECRET);

  it('issues a verifiable operator session for the published credentials', () => {
    const now = new Date('2026-07-26T00:00:00.000Z');
    const result = useCase.execute(CREDENTIALS, now);

    expect(result).toMatchObject({ subject: CREDENTIALS.email, role: 'operator', demo: true });
    const claims = verifySession(result.token, SECRET, now);
    expect(claims.exp - claims.iat).toBe(DEFAULT_SESSION_TTL_SECONDS);
  });

  it('accepts the email case-insensitively', () => {
    expect(() =>
      useCase.execute({ email: 'OPS.DEMO@FieldRelay.IO', password: CREDENTIALS.password })
    ).not.toThrow();
  });

  it.each([
    ['a wrong password', { email: CREDENTIALS.email, password: 'wrong' }],
    ['a wrong email', { email: 'someone@else.test', password: CREDENTIALS.password }],
    ['empty credentials', { email: '', password: '' }]
  ])('refuses %s', (_label, input) => {
    expect(() => useCase.execute(input)).toThrow(AuthenticationError);
  });

  it('gives the same message whichever field was wrong', () => {
    // A different message per field would let an attacker enumerate valid
    // accounts one request at a time.
    const wrongEmail = grabMessage(() =>
      useCase.execute({ email: 'nobody@test.io', password: CREDENTIALS.password })
    );
    const wrongPassword = grabMessage(() =>
      useCase.execute({ email: CREDENTIALS.email, password: 'nope' })
    );
    expect(wrongEmail).toBe(wrongPassword);
  });
});

function grabMessage(run: () => unknown): string {
  try {
    run();
    return 'no error';
  } catch (error) {
    return (error as Error).message;
  }
}
