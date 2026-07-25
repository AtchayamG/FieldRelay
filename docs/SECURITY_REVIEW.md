# Security Review

## 2026-07-24 — Foundation assessment

### Implemented

- Public call request accepts an authorized contact identifier, not a raw phone number.
- Application use case validates incident, contact, purpose, idempotency key, bounded timeout, and bounded retries before invoking a provider.
- Contact authorization and allowed purposes are resolved behind a port.
- Demo adapter never dials and returns `simulated: true`.
- Domain/application layers have no NestJS or HTTP imports.
- Collision-safe UUIDs replace time/random identifiers.
- CALL-E credentials and real phone numbers are absent.
- Dependency audit reports no known vulnerabilities after upgrading NestJS and overriding the patched `qs` version.
- Frontend moved to Angular 20.3 after Angular 19 advisories had no patched 19.x release.
- Workspace transitive build dependencies are pinned to patched versions; `pnpm audit` reports no known vulnerabilities.
- Demo authentication accepts only the published evaluator credentials and respects session-vs-persistent storage.
- Unsupported routes, search, password recovery, and incident creation are disabled and labeled instead of implying working production capabilities.
- Frontend feature components consume centralized theme tokens; no feature-level color literals remain.

## 2026-07-26 — Session boundary

### Closed since the foundation assessment

- Every API route is closed by default. `SessionGuard` is registered as a global `APP_GUARD`, so a newly added controller is protected unless it explicitly carries `@PublicRoute()`. Forgetting to think about authentication now yields a locked route rather than an open one.
- Four routes opt out, each for a stated reason: `/health` (liveness must answer before anyone can sign in), `POST /api/v1/auth/session` (issuing a session cannot require one), the provider callback route (authenticated by HMAC over the raw body) and the CALL-E webhook route (authenticated by its URL token).
- `POST /api/v1/calls` — the only endpoint that can cause a real-world side effect and spend money — refuses anonymous callers with 401, and an end-to-end test asserts the provider is never invoked in that case.
- Session tokens are HMAC-SHA256 signed with a secret of at least 32 characters, carry an expiry, and are verified in constant time. There is no algorithm field to downgrade. A tampered payload, a foreign signature, a malformed token and an expired token are all refused.
- Credential comparison is constant time and hash-based, so neither field length nor response timing distinguishes a wrong email from a wrong password. Both failures return an identical message, so accounts cannot be enumerated.
- The frontend no longer decides who is signed in. It exchanges credentials for an API-issued token, attaches it to every `/api/` request through an interceptor, and clears the session on any 401.

### Honest limits of this control

The evaluator credentials are published by design so judges can sign in unaided. This is therefore an **access boundary, not an identity system**: it guarantees no route mutates state for an anonymous caller and gives the deployment one place to enforce and revoke sessions, but it does not authenticate a specific human. What actually protects the call budget on a public deployment is `CALL_E_MODE`, which leaves the judge environment structurally incapable of dialling. Real identity, per-tenant isolation and role separation remain open.

### Open controls

- BLOCKED: production CALL-E credentials and authorized test number.
- TODO: persistence-backed idempotency/deduplication and optimistic locking.
- DONE (demo grade): a global session boundary with signed, expiring tokens — see the 2026-07-26 entry above.
- TODO: real identity and RBAC beyond the single operator role, per-tenant isolation, rate limiting, and CSP/HSTS.
- TODO: real contact encryption/token resolution and consent evidence/expiry.
- TODO: webhook signature, timestamp, replay, and redaction controls.
- TODO: audit persistence, transcript access controls, retention, and secret scanning in CI.

The current endpoint is a safe demo foundation, not production-ready.
