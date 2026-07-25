# Handover

## Current state

The blueprint and mockup packages are complete. `codex/devpost-foundation` carries the API-backed incident flow, the durable simulated-call queue/detail flow, and — as of 2026-07-25 — replay-safe provider callbacks and bounded stale-reservation reconciliation. A full gap analysis with a prioritized backlog is in `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md`; read it with `docs/ARCHITECTURE_AND_FOLDER_STRUCTURE.md`, `docs/DELIVERY_PLAN.md`, and `docs/DEVPOST_READINESS.md`.

## Approved direction (2026-07-25)

- Track 0 repository hygiene first, then live CALL-E, security, closed-loop workflow, route breadth, visual/test/deploy, submission package.
- CALL-E is integrated through the connected MCP connector (`plan_call` / `run_call` / `get_call_run`) behind the existing `CallEPort`.
- All 15 designed routes are in scope, with real connected data only.
- `main` becomes the working baseline; each track lands from a short-lived `codex/*` branch.

## Highest-priority task

Place one real authorized CALL-E call to close G1. That needs a CALL-E account (20 free calls on signup), `CALLE_API_KEY`, `CALLE_BASE_URL`, a webhook URL reachable from the internet with `CALLE_WEBHOOK_TOKEN`, and one nominated number in `CALLE_DIAL_TARGETS`. Then build the API authentication boundary (G14), which must land before any public deployment.

## Known blockers/risks

- Human eligibility attestations, CALL-E account email, public PR, demo video, deployment, and final Devpost submission all require explicit user approval.
- Deadline confirmed as 2026-09-14 23:45 SGT by the official overview header. About seven weeks remain.
- The API has no authentication or authorization on any route, including call initiation. This must land before any public deployment.
- The CALL-E developer API is in beta: response and webhook shapes are parsed defensively because the full reference is a client-rendered page that could not be read directly. Re-verify field names against a real response before the demo.
- CALL-E's webhook has no documented signing scheme, so that route is authenticated by a URL token. Replace it with signature verification if CALL-E publishes one.
- The production frontend build succeeds but its initial JavaScript chunk is 1.23 MB.
- Mission Control still renders demo adapter data rather than live API data.
- Nine of fifteen designed routes are unimplemented.
- No committed end-to-end, visual-regression, or accessibility automation exists; previous browser passes were manual.
- Global Angular CLI is absent; use pinned workspace tooling.
