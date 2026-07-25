# Handover

## Current state

The blueprint and mockup packages are complete. `codex/devpost-foundation` carries the API-backed incident flow, the durable simulated-call queue/detail flow, and — as of 2026-07-25 — replay-safe provider callbacks and bounded stale-reservation reconciliation. A full gap analysis with a prioritized backlog is in `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md`; read it with `docs/ARCHITECTURE_AND_FOLDER_STRUCTURE.md`, `docs/DELIVERY_PLAN.md`, and `docs/DEVPOST_READINESS.md`.

## Approved direction (2026-07-25)

- Track 0 repository hygiene first, then live CALL-E, security, closed-loop workflow, route breadth, visual/test/deploy, submission package.
- CALL-E is integrated through the connected MCP connector (`plan_call` / `run_call` / `get_call_run`) behind the existing `CallEPort`.
- All 15 designed routes are in scope, with real connected data only.
- `main` becomes the working baseline; each track lands from a short-lived `codex/*` branch.

## Highest-priority task

Implement the live CALL-E adapter behind `CallEPort` (gap G1) with a dry-run default, credential handling outside the repository, and an authorized end-to-end proof. Wire a periodic runner for `ReconcileStaleReservationsUseCase` (G13) in the same track.

## Known blockers/risks

- Human eligibility attestations, CALL-E account email, public PR, demo video, deployment, and final Devpost submission all require explicit user approval.
- Rules prose lists 11:45 AM SGT while Devpost key-date data lists 11:45 PM SGT on 2026-09-14; plan to the earlier time. About seven weeks remain.
- The API has no authentication or authorization on any route, including call initiation. This must land before any public deployment.
- Local Node is 22.9 against a `>=22.12` engine requirement; upgrade before release builds.
- The production frontend build succeeds but its initial JavaScript chunk is 1.23 MB.
- Mission Control still renders demo adapter data rather than live API data.
- Nine of fifteen designed routes are unimplemented.
- No committed end-to-end, visual-regression, or accessibility automation exists; previous browser passes were manual.
- Global Angular CLI is absent; use pinned workspace tooling.
