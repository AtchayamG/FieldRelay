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

### Open controls

- BLOCKED: production CALL-E credentials and authorized test number.
- TODO: persistence-backed idempotency/deduplication and optimistic locking.
- TODO: production authentication, RBAC, judge-role restrictions, rate limiting, CSP/HSTS, request schema validation, and centralized error envelopes.
- TODO: real contact encryption/token resolution and consent evidence/expiry.
- TODO: webhook signature, timestamp, replay, and redaction controls.
- TODO: audit persistence, transcript access controls, retention, and secret scanning in CI.

The current endpoint is a safe demo foundation, not production-ready.
