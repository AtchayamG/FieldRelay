# Handover

## Current state

Repository audit and the full authority stack are complete. Work continues on `codex/devpost-foundation`. Read `docs/ARCHITECTURE_AND_FOLDER_STRUCTURE.md`, `docs/DELIVERY_PLAN.md`, and `docs/DEVPOST_READINESS.md`.

## Highest-priority task

Add persistence-backed idempotency and the incident vertical slice, then connect the UI to the API behind the existing ports. Keep the build runnable and all calls explicitly simulated until credentials and an authorized number are supplied.

## Known blockers/risks

- Human eligibility attestations, CALL-E account email, public PR/video/deploy, and final Devpost submission.
- Rules prose lists 11:45 AM SGT while Devpost key-date data lists 11:45 PM SGT on 2026-09-14; plan to the earlier time.
- Global Angular CLI is absent; use pinned workspace tooling.
- Local Node 22.9 is below Vite 7's supported 22.x floor; upgrade to Node >=22.12 before release work.
- The production frontend build succeeds but its initial JavaScript chunk is 1.21 MB; reduce it before the performance gate.
- Mission Control is intentionally the only implemented operations route. Planned routes and incident creation are visibly disabled, not placeholders.
