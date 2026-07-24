# Implementation Changelog

## Blueprint package

- Added authoritative product and architecture documents.
- Added 15 routes in dark/light desktop/tablet/mobile references.
- Added deterministic mockup renderer and design tokens.

## 2026-07-24 — Delivery foundation

- Audited repository, Git, toolchains, all authoritative documents, page specs, and mockup manifest.
- Verified official CALL-E rules, submission fields, dates, and judging criteria.
- Added permanent agent rules, Clean Architecture folder decision, delivery plan, and Devpost evidence matrix.
- Recorded the official `awesome-phone-call-agents` repository as the contribution and safety-pattern reference.
- Added pnpm monorepo, NestJS 11 API, shared contracts/testing packages, and CI.
- Added a guarded CALL-E application port and explicit demo adapter with authorization/purpose checks.
- Added 15 focused backend tests and resolved all dependency-audit findings.
- Added Ionic Angular 20 responsive application foundation, centralized design tokens, demo sign-in, and Mission Control.
- Upgraded from Angular 19 after its branch surfaced unpatched high-severity advisories; the workspace audit is clean.
- Added explicit demo-only wording and disabled unavailable navigation/actions instead of shipping fake interactions.
- Fixed production-only Zone bootstrap, global/Ionic CSS loading, router page stacking, dashboard scrolling, and mobile overflow found through browser validation.
- Verified theme switching, session flows, state simulation, approval decisions, responsive layout, and a clean console in a production preview.

## 2026-07-24 — Incident and durable call-task slices

- Added API-backed incident list, create, and detail routes with loading, empty, degraded, permission, validation, and error states.
- Added accessible linked desktop/mobile incident records, server-backed filters, secure create idempotency keys, and exact backend input bounds.
- Added PostgreSQL migration `0002_call_tasks`, call-task repository ports/adapters, atomic queued-task/idempotency persistence, and optimistic updates.
- Persisted provider success and ambiguous `outcome_unknown` results while keeping provider I/O outside database transactions.
- Added bounded cursor-based call list/detail APIs without exposing idempotency keys, raw numbers, transcripts, or raw provider payloads.
- Verified 121 workspace tests, production build, clean dependency audit, fresh Compose initialization, and the real local incident browser flow.
