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

The evaluator credentials are published by design so judges can sign in unaided. This is therefore an **access boundary, not an identity system**: it guarantees no route mutates state for an anonymous caller and gives the deployment one place to enforce and revoke sessions, but it does not authenticate a specific human. `CALL_E_MODE` is the final side-effect gate, but the current public deployment intentionally uses exact live mode. Anyone with the published credentials can therefore request the single provisioned contact for its declared purpose. The allowlist, purpose policy, disclosure, bounded retries and idempotency limit the effect; they do not identify a judge or prevent repeated requests with new idempotency keys. Keep public-live exposure supervised and return the deployment to demo mode when judge-triggered calling is not required. Real identity, per-tenant isolation, role separation and rate limiting remain open.

### Open controls

- DONE: production CALL-E credentials and the authorized target are held server-side; the raw number
  is never returned, logged, persisted in call records, or committed.
- DONE: PostgreSQL-backed idempotency reservations commit before provider I/O; webhook deliveries
  are deduplicated and lifecycle transitions are validated.
- DONE (demo grade): a global session boundary with signed, expiring tokens — see the 2026-07-26 entry above.
- TODO: real identity and RBAC beyond the single operator role, per-tenant isolation, rate limiting, and CSP/HSTS.
- TODO: real contact encryption/token resolution and consent evidence/expiry.
- DONE: the generic callback uses HMAC, timestamp freshness and replay protection; the CALL-E route
  uses its provider token and the same replay-safe processing path.
- PARTIAL: audit persistence and no-transcript storage are implemented. Automated secret scanning in
  CI and a formal retention policy remain open.

The current endpoint is a bounded hackathon integration, not a general multi-tenant production
identity or telephony platform.

## 2026-09-02 — Current public-live posture

- Production was verified in exact live mode with one masked, provisioned `IN · en-IN` contact.
- Public evaluator credentials are not a judge identity. A signed-in visitor can spend a call only
  against that provisioned contact and declared purpose, but can submit a new idempotency key.
- No raw phone number or caller-authored prompt crosses the public API. The application derives the
  provider brief from the authorized purpose and commits the task/idempotency reservation first.
- A real attempt reached CALL-E, but provider speech began only after roughly 23 seconds and the
  recipient attempt failed. Do not promise a prompt greeting or place another diagnostic call before
  provider guidance.
- Operational recommendation: use public live mode only during a supervised judging window; use
  demo mode for unrestricted public browsing.

## 2026-09-02 — Lost-webhook reconciliation boundary

- `POST /api/v1/calls/:callTaskId/reconcile` is session-protected by the global guard.
- It accepts only a FieldRelay UUID and resolves the provider identifier from persistence; callers
  cannot supply a phone number or arbitrary provider id.
- It refuses simulated tasks, missing provider ids, and already-terminal tasks before provider I/O.
- The infrastructure adapter issues only `GET /v1/calls/{id}` and requires the returned id to match.
- Phone numbers, transcripts, summaries, evidence, recordings, and provider failure prose are neither
  returned nor persisted. Only normalized status and the declared structured outcome cross the port.
- Terminal data is applied through the existing deduplicated callback transaction, including schema
  validation, approval policy, audit, and lifecycle transition checks.
- No start/retry/redial dependency is reachable from the reconciliation use case.
