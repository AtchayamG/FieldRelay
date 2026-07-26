# Handover

## Current state

`main` carries a working, session-protected incident and call system that has placed a real CALL-E call end to end. Read `docs/SYSTEM_STATE_FOR_AGENTS.md` first — it is the single description of what actually exists — then `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md` for what remains and `docs/DEVPOST_READINESS.md` for submission status.

Verified on 2026-07-26 with PostgreSQL 17 running: lint, strict typecheck, 258 tests, production builds.

## Landed since the foundation

- **Live CALL-E integration (ADR-004).** `CalleApiAdapter` calls `POST /v1/calls` with bearer auth, a per-task idempotency key, a purpose-derived brief with mandatory disclosure, and a closed result schema. Contract verified against the published OpenAPI document.
- **Runtime proof.** Call `call_MzD1ou1AbX1XtYkTnxMCBA` completed with `{ available: "yes", quoted_amount_text: "$35" }` and confidence 0.82. Recorded in `docs/CALL_E_RUNTIME_PROOF.md`.
- **Session boundary.** Global guard, routes closed by default, HMAC tokens with expiry, frontend interceptor. An anonymous `POST /api/v1/calls` returns 401 and the provider is never invoked.
- **Operator-changeable call target.** Settings screen and `PUT /api/v1/settings/dial-target`, gated by `CALLE_ALLOW_RUNTIME_DIAL_TARGET` which defaults to false. Numbers are validated, bound to an authorized contact, masked in every response, and never audited in full.
- **Deployment.** Multi-stage Dockerfiles for API and web, `docker-compose.judge.yml`, nginx same-origin proxy with CSP and security headers.
- **Two real defects fixed.** Migration 0004 gave the idempotency foreign key a delete rule so call tasks can be purged; the CALL-E request timeout was raised to 45s after a 15s timeout abandoned a call that had already been accepted.

## In flight: the closed loop

Structured outcome ingestion is **complete on the backend** — validation, persistence, webhook wiring and audit. Migration `0006_call_outcomes.sql` needs applying to any environment that predates it.

The outcome is now exposed on `GET /api/v1/calls/:callTaskId` and rendered on call detail. Migration 0006 has been applied to the deployed Neon database.

Remaining on this track, in order:

1. **Approvals** — the human decision gate over a validated outcome. This is what turns an AI phone call into an accountable business decision, and it is the screen judges score hardest.
3. **Dispatch** — approved outcome to assigned technician.
4. Mission Control: wire the metric cards and incident queue to real API data, keeping the orchestration flow and live-mission panel as clearly-labelled illustrations. Approved 2026-07-26. Note that demo-versus-live is a deployment-wide setting, not a per-user one, so mode-based switching would show judges sparse real data instead of the richer picture.

## Highest-priority task

Deploy the judge environment to a public URL and record the testing instructions on the Devpost form. `docker-compose.judge.yml` runs the whole stack and is already configured to be incapable of placing a call. After that: ingest structured call results so the approval and dispatch loop can begin, since that is what turns a completed call into a workflow.

## Known blockers and risks

- Human-only: eligibility attestations, the CALL-E account email, the public demo video, the upstream pull request, and the final Devpost submission.
- Deadline 2026-09-14 23:45 SGT, confirmed on the official overview page.
- Free CALL-E calls are finite and are what judges will use. Do not spend them on testing.
- Nine of fifteen designed routes are unbuilt, and Mission Control still renders demo-adapter data rather than live API data.
- No end-to-end browser automation, visual-regression baselines, or accessibility scanning is committed; previous browser passes were manual.
- The initial frontend chunk is 1.23 MB.
- CALL-E's webhook publishes no signing scheme, so that route is authenticated by a URL token. Replace it if one is published.
- The published evaluator credentials mean the session boundary is an access control, not an identity system. `CALL_E_MODE` is what protects the call budget.
