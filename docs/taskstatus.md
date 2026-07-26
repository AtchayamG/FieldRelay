# Task Status

## 2026-07-24

- Blueprint package: Complete and audited
- Reference mockups: Complete (90 images); Mission Control desktop/mobile visually inspected
- Git baseline: clean `main` at `3e33220`, remote verified
- Official CALL-E rules: verified; submissions open
- Eligibility/legal attestations: BLOCKED on user confirmation
- Deadline: RISK due official prose/key-date time conflict; use earlier 11:45 AM SGT until clarified
- External agents: Claude Code 2.1.207, Antigravity 1.1.4, Hermes 0.18.0 available
- Architecture/folder structure: selected
- Delivery/evidence plan: created
- Application implementation: persisted incident vertical slice and durable simulated-call task slice integrated on `codex/devpost-foundation`
- Frontend: Ionic Angular 20 sign-in, responsive shell, Mission Control, API-backed incident list/create/detail, and simulated-call queue/detail routes
- Verification: frozen install, lint, strict typecheck, 139 tests, production build, dependency audit, PostgreSQL 17 integration, and browser runtime checks pass
- Browser coverage: incident create/detail/search/filter and call queue/detail/filter flows; empty and validation states; dark/light themes; desktop and 430 px mobile; no horizontal page overflow; clean console
- Backend security boundary: authorized contact IDs only; bounded inputs; atomic call reservation/task persistence; explicit simulated adapter; ambiguous outcomes are non-redialable
- Call read APIs: `GET /api/v1/calls` and `GET /api/v1/calls/:callTaskId` with bounded filters and cursor pagination
- Call operations UI: persisted queue/detail records, status and incident filters, mobile cards, visible simulation disclosure, and non-redialable `outcome_unknown` reconciliation guidance
- Frontend safety boundary: demo-only credentials, explicit simulated labeling, unavailable routes/actions disabled rather than faked
- CALL-E real-call proof: BLOCKED on credentials and authorized test number; safe demo adapter remains in scope
- Release risks: Node must be upgraded from 22.9 to >=22.12; initial frontend chunk is 1.23 MB

## 2026-07-25

- Gap analysis: complete — 25 tracked gaps in `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md`, ordered into seven execution tracks
- Approved direction: Track 0 hygiene first; CALL-E via the MCP connector behind `CallEPort`; all 15 routes in scope; `main` as the working baseline with short-lived `codex/*` branches per track
- Provider callback and reconciliation slice: verified (lint, strict typecheck, 96 passing tests with 15 PostgreSQL-dependent tests skipped) and committed
- Repository hygiene: `.gitattributes` added so line endings no longer depend on per-machine `core.autocrlf`; the previously reported 156-file dirty tree was a cross-platform inspection artifact, not real churn
- Environment template: duplicated `FRONTEND_ORIGINS` removed and the required `CALLBACK_SIGNING_SECRET` documented
- Highest open risks: no live CALL-E adapter (G1), no API authentication or authorization on any route (G14), nine of fifteen routes unimplemented (G7), no deployable artifact or judge environment (G5)
- Official hackathon research: CALL-E offers MCP, SDK, REST API, CLI and Skill surfaces; deadline confirmed as 2026-09-14 23:45 SGT; new accounts include 20 free calls; submission requires a PR to `CALLE-AI/awesome-phone-call-agents`, a public sub-three-minute video and the CALL-E account email
- CALL-E integration: `CalleApiAdapter` calls `POST /v1/calls` behind `CallEPort` with bearer auth, a per-task idempotency key, a purpose-derived brief with mandatory disclosure, a closed result schema and a webhook URL (ADR-004 supersedes ADR-003)
- Call safety: `CALL_E_MODE` defaults to demo and only the exact value `live` enables dialling; live mode fails at boot on invalid configuration; phone numbers exist only in `CALLE_DIAL_TARGETS` and are validated at boot
- CALL-E webhook: token-authenticated route translating provider deliveries into the existing replay-safe callback pipeline, discarding transcripts, recordings and structured results
- Toolchain: Node upgraded to 24.18.0 LTS, clearing the `>=22.12` engine blocker and the Vite engine warning
- Verification: lint, strict typecheck, 198 tests and production builds pass
- Remaining on the CALL-E proof: a CALL-E API key and an authorized test number, both user-supplied

## 2026-07-26

- CALL-E runtime proof: COMPLETE — FieldRelay placed call `call_MzD1ou1AbX1XtYkTnxMCBA`, which returned `{available: yes, quoted_amount_text: $35}` with 0.82 confidence and round-tripped the call task IDs; recorded in `docs/CALL_E_RUNTIME_PROOF.md`
- API key: created self-service in the CALL-E dashboard (free, 2 per account, 90-day expiry); stored only in the git-ignored `.env`
- Session boundary: global guard closes every route by default; HMAC tokens with expiry; anonymous call initiation returns 401 and never reaches the provider
- Operator-changeable call target: Settings screen plus `GET/PUT/DELETE /api/v1/settings/dial-target`, gated by `CALLE_ALLOW_RUNTIME_DIAL_TARGET` (default false), numbers validated, contact-bound, masked in responses and audit
- Deployment: multi-stage Dockerfiles for API and web, `docker-compose.judge.yml`, nginx same-origin proxy with CSP and security headers
- Defects fixed: idempotency foreign key had no delete rule so call tasks could not be purged (migration 0004); CALL-E request timeout raised 15s to 45s after a client timeout abandoned an accepted call and a naive retry dialled twice
- Agent documentation: `docs/SYSTEM_STATE_FOR_AGENTS.md` added and `AGENTS.md` updated with the non-negotiable call-safety rules
- Verification: lint, strict typecheck, 258 tests with PostgreSQL 17, production builds — all pass
- Remaining highest-priority: deploy the judge environment to a public URL and capture testing instructions; then ingest structured call results to open the approval and dispatch loop

- Live judge environment: DEPLOYED to https://fieldrelay-pi.vercel.app (Vercel: static SPA + whole NestJS API in one serverless function + Neon PostgreSQL, five migrations applied, three seeded incidents)
- Live verification: health 200, anonymous read 401, demo login issues an operator session, incidents load, call returns simulated, dial-target change returns 403, SPA deep links resolve, CSP present
- Deployed environment cannot place a real call: CALL_E_MODE=demo, no CALL-E credential present, runtime dial-target changes refused
