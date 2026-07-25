# Gap Analysis and Delivery Backlog

**Date:** 2026-07-25
**Analyzed branch:** `codex/devpost-foundation` (11 commits ahead of `main` baseline `3e33220`)
**Goal:** Deliver FieldRelay as a fully working, Clean Architecture-based, visually faithful, secure, tested, clean, deployable, CALL-E-integrated, Devpost-ready application — stopping for explicit approval before production publication or final submission.

---

## 1. Verified current state

| Area | Evidence | Status |
|---|---|---|
| Blueprint (14 authority docs) | `docs/00`–`docs/13` | Complete |
| Reference mockups | 90 PNGs (15 pages × 3 viewports × 2 themes) + 15 page specs + design tokens | Complete |
| Monorepo, CI, tokens, contracts | pnpm workspace, `.github/workflows/ci.yml`, `packages/*` | Working |
| Backend vertical slices | incidents (create/list/get), call tasks (start/list/get), provider callbacks, stale-reservation reconciliation | Working, tested |
| Persistence | PostgreSQL 17, 3 migrations, deterministic seed, UoW + in-memory test double | Working |
| Frontend | Ionic Angular 20, sign-in, responsive shell, Mission Control, incidents ×3, calls ×2 | Working |
| Tests | 139 passing (API 85 / app 52 / tokens 2) + 96 in the uncommitted callback slice | Passing locally |
| Architecture discipline | domain has no Nest/HTTP/PG imports; ports + adapters throughout | Holding |

**Assessment:** the foundation is unusually solid and honest — no placeholder screens, no fake capability. The gaps are breadth, live CALL-E, production security, and delivery mechanics, not structural quality.

---

## 2. Gaps by severity

### P0 — Blocks the submission itself

> **Status update 2026-07-25.** Track 0 is complete and Track 1 has landed in code.
> G2, G3, G4, G6 and G16 are closed. G1 is substantially addressed: a live
> `CalleApiAdapter` now calls the CALL-E developer API behind `CallEPort`, and a
> token-authenticated CALL-E webhook route feeds the existing callback pipeline.
> What remains on G1 is a real authorized call, which needs a CALL-E API key and
> a nominated test number. G13 is unchanged. The design record is ADR-004, which
> supersedes ADR-003.

**G1. No live CALL-E integration exists.** *(largely closed 2026-07-25 — proof call outstanding)*
`DemoCallEAdapter` is the only implementation of `CallEPort`; it returns `simulated: true` and never dials. The Devpost requirement "CALL-E imported/called at runtime" is currently **unmet**. The callback endpoint (`POST /api/v1/call-e/callbacks`, HMAC-verified) and reconciliation use case exist but nothing on the platform produces those callbacks.
Needs: a real `CallEAdapter` behind the existing port, credential handling from a secret store, outbound request mapping (`StartCallTaskCommand` per `docs/06`), and one authorized end-to-end proof.
Blocked on: CALL-E credentials + an explicitly authorized test number.
Note: a CALL-E MCP connector (`plan_call` / `run_call` / `get_call_run`) is reachable from this session and is a viable proof path or reference for the request/response shape.

**G2. Callback slice is uncommitted.**
`process-provider-callback.use-case.ts`, `reconcile-stale-reservations.use-case.ts`, `provider-callback.controller.ts`, their two spec files, and migration `0003_call_callbacks.sql` are untracked. They exist only in the working tree.

**G3. No `.gitattributes` (downgraded from blocker).**
An initial reading of a 156-file dirty tree was a tooling artifact: the repository relies on `core.autocrlf=true` in local Windows config, so a Linux view of the same working copy reports every file as CRLF-modified. On the host, `git status` is clean apart from the callback slice. The real gap is that line-ending behavior depends on per-machine git config rather than a committed `.gitattributes`, which will churn once CI or another contributor works on Linux.

**G4. Nothing is merged to `main`.**
All work sits on `codex/devpost-foundation`; seven `codex/worker-*` branches remain unmerged; `.tmp/worktrees` still present. `main` still contains only the blueprint.

**G5. No deployable artifact or judge environment.**
No Dockerfile for API or app; `docker-compose.yml` containerizes PostgreSQL only. No staging/production config, no hosted URL, no judge test credentials/instructions. "Testing access" is a required Devpost field.

**G6. Node/toolchain blocker.** *(closed 2026-07-25)*
The workstation now runs Node 24.18.0 LTS, above the `>=22.12` engine floor, and the Vite engine warning no longer appears in `pnpm build`. Note: installing nvm-windows silently removed the previous `C:\Program Files\nodejs` installation before its own elevated step completed, so the recovery was a direct Node LTS install. Do not install nvm-windows silently on this machine again.

### P1 — Blocks "fully working" and "visually faithful"

**G7. 9 of 15 designed routes are unimplemented.**
Implemented: Login, Mission Control, Incidents, Incident Detail, Create Incident, Calls & AI Ops.
Missing: **Dispatch, Technicians, Vendor Detail, Approvals, Customers & Properties, Analytics, Audit & Consent, Knowledge Base, Settings.**
The IA specifies 12 primary nav destinations; only 3 resolve to real routes.

**G8. Mission Control is not API-backed.**
`MissionControlDemoAdapter` builds all metrics, approvals, live-call missions, orchestration steps, activity and performance data in memory. The port boundary is correct, so this is an adapter swap — but the flagship screen currently shows synthetic data.

**G9. The workflow state machine is not implemented.**
`docs/06` defines Draft → … → OutcomeValidation → AwaitingApproval → DispatchReady → Dispatched → ArrivalCheck → Resolved. Code implements only the provider-status subset (`queued → ringing → connected → completed/failed/no_answer`). There is no workflow instance, structured-outcome validation, confidence/needs-review path, retry scheduling, or escalation.

**G10. Incidents cannot change state.**
Only `POST` / `GET` exist. No status transition, assignment, closure, commitment timeline, or note/evidence attachment. The incident is currently write-once.

**G11. Domain model is ~2 of 12 entities.**
Persisted: `incidents`, `call_tasks`, `provider_callbacks`, `operation_idempotency`, audit events. Absent: workflow instance, approval, dispatch, vendor, technician, commitment, consent record, property, contact (real), knowledge document.

**G12. Structured call outcomes are deliberately rejected.**
The callback DTO explicitly refuses transcript/outcome/payload blobs. That was correct for the safety-first slice, but the approval and dispatch loop — the core product story — cannot exist until a validated, bounded outcome schema is ingested with access controls.

**G13. Reconciliation has no scheduler.**
`ReconcileStaleReservationsUseCase` is wired into `AppModule` but nothing invokes it periodically. Stale reservations accumulate silently.

### P2 — Blocks "secure"

**G14. The API has zero authentication or authorization.**
No guard, no bearer token, no session, no RBAC on any route — including `POST /api/v1/calls` (call initiation) and `POST /api/v1/incidents`. Frontend auth is client-side demo credentials only. On any public deployment this is an open call-initiation endpoint.

**G15. Missing standard HTTP hardening.**
No helmet/CSP/HSTS, no rate limiting or per-IP throttling, no request body size caps beyond DTO bounds, no centralized security headers.

**G16. `.env.example` is stale and inconsistent.**
`FRONTEND_ORIGINS` is defined twice; `CALLBACK_SIGNING_SECRET` — required (min 16 chars) by the callback controller — is **not documented at all**. Deployments will fail closed or, worse, misconfigure.

**G17. Consent, retention and transcript controls are unimplemented.**
`docs/08` requires consent evidence + expiry, disclosure policy enforcement, transcript access control, retention windows, and an auditable data-subject path. None exist.

**G18. No secret scanning or dependency audit in CI.**
`pnpm audit` and secret scanning are run manually; CI runs lint → typecheck → migrate → test → build only.

### P2 — Blocks "tested"

**G19. No committed end-to-end automation.**
Reports cite "Playwright runtime flow: PASS", but there is no Playwright config, no spec files, and no browser job in CI. Those runs were manual and are not reproducible.

**G20. No visual regression harness.**
`docs/11` requires image-diff baselines at 430/768/1024/1280/1920 px in both themes. Zero baselines committed. Visual fidelity against the 90 mockups is currently asserted by eye.

**G21. No accessibility automation.**
No axe/pa11y run; `docs/11` requires WCAG AA. Known issue: emoji pictograms still stand in for an icon system.

**G22. Untested areas.** Offline/PWA behavior (manifest exists, no service worker), Capacitor native build (no `android/` or `ios/` project), failure injection, load/concurrency, backup/restore, cross-browser.

### P3 — Polish and performance

**G23.** Initial JS chunk is 1.23 MB (292 KB gzip) against the performance gate.
**G24.** Emoji pictograms need replacement with a repo-native accessible icon set.
**G25.** Docs are accurate but fragmented across 26 files; the judge-facing README/setup story needs consolidation.

### P3 — Devpost mechanics

| Item | Owner | State |
|---|---|---|
| Functional CALL-E proof | Codex | TODO — depends on G1 |
| Judge environment + testing instructions | Codex | TODO — depends on G5 |
| Project/use-case/testing answers | Codex | TODO — draft from verified product |
| Screenshots + README | Codex | TODO |
| Upstream PR to `CALLE-AI/awesome-phone-call-agents` | Codex prepares / **user approves** | BLOCKED |
| Public demo video (<3 min) | **User** | BLOCKED |
| CALL-E account email | **User** | BLOCKED |
| Age / country / conflict attestations | **User** | BLOCKED |
| Final legal checkboxes + submit | **User** | BLOCKED |
| Deadline | Both | RISK — rules prose says 11:45 **AM** SGT, key-date data says 11:45 **PM** SGT on 2026-09-14. Plan to the earlier time. ~7 weeks remain. |

---

## 3. Recommended execution order

Each track leaves the build runnable and is independently verifiable.

**Track 0 — Repository hygiene (hours, unblocks everything).**
Add `.gitattributes` (`* text=auto`, binaries marked) so line endings stop depending on per-machine config, commit the verified callback slice, merge the integration branch to `main`, prune worker branches and `.tmp/worktrees`, upgrade Node to ≥22.12.

**Selected direction (2026-07-25):** Track 0 first; CALL-E integrated through the MCP connector (`plan_call` / `run_call` / `get_call_run`) behind the existing `CallEPort`; all 15 designed routes in scope; merge to `main` now and work in short-lived `codex/*` branches per track.

**Track 1 — Live CALL-E (P0, submission-critical).**
Real adapter behind `CallEPort`, credentials from environment/secret store, outbound mapping, dry-run mode, one authorized end-to-end proof with recorded evidence. Fix `.env.example` (G16) as part of this. Wire the reconciliation scheduler (G13).

**Track 2 — Security boundary.**
API authentication + role-based authorization, helmet/CSP/HSTS, rate limiting, audit of every mutation, `pnpm audit` + secret scanning in CI. Required before any public deployment.

**Track 3 — Closed-loop workflow.**
Structured outcome ingestion with bounded schema and access control → workflow instance → approval queue → dispatch → commitment timeline → incident lifecycle mutation. This is the product story judges score.

**Track 4 — Route breadth.**
Approvals, Dispatch, Audit & Consent, Settings first (they carry real data from Track 3); then Technicians, Vendor Detail, Customers, Analytics, Knowledge Base. Real connected data only — no placeholder screens.

**Track 5 — Visual fidelity and accessibility.**
Mission Control on real API data, image-diff baselines at 5 widths × 2 themes, icon system, axe automation, bundle reduction.

**Track 6 — Test and deploy.**
Playwright E2E in CI, PWA/offline, Capacitor Android build, Dockerfiles + deployment manifests, staging judge environment with test credentials.

**Track 7 — Submission package.**
README/setup, screenshots, Devpost answers, upstream contribution branch, video script and recording plan.
**Stop for explicit user approval before:** production publication, the upstream PR, the video upload, and final Devpost submission.

---

## 4. Standing constraints for all tracks

- Dependencies point inward: presentation → application → domain; infrastructure implements ports.
- No real call without an allowlisted contact, explicit purpose, disclosure policy, bounded retries, idempotency, and an audit event.
- Ambiguous outcomes remain non-redialable.
- Simulated and real calls stay visibly distinct.
- No secrets, raw phone numbers, transcripts, or raw provider payloads committed, logged, or returned.
- Every slice ships with focused tests and a handoff record.
