# Handover

## Current state

Repository audit and the full authority stack are complete. Work continues on `codex/devpost-foundation`. The API-backed incident list/create/detail flow and durable simulated-call task persistence are integrated. Read `docs/ARCHITECTURE_AND_FOLDER_STRUCTURE.md`, `docs/DELIVERY_PLAN.md`, and `docs/DEVPOST_READINESS.md`.

## Highest-priority task

Implement the call queue/detail frontend against `GET /api/v1/calls` and `GET /api/v1/calls/:callTaskId`, including an unmistakable simulated label and an `outcome_unknown` reconciliation state. Add browser coverage without enabling real calls.

## Known blockers/risks

- Human eligibility attestations, CALL-E account email, public PR/video/deploy, and final Devpost submission.
- Rules prose lists 11:45 AM SGT while Devpost key-date data lists 11:45 PM SGT on 2026-09-14; plan to the earlier time.
- Global Angular CLI is absent; use pinned workspace tooling.
- Local Node 22.9 is below Vite 7's supported 22.x floor; upgrade to Node >=22.12 before release work.
- The production frontend build succeeds but its initial JavaScript chunk is 1.21 MB; reduce it before the performance gate.
- Call queue/detail UI, provider callbacks, stale-reservation reconciliation, production authentication/RBAC, and incident lifecycle mutation are not implemented yet.
- Claude Code authentication works, but the account reached its monthly spend limit during the call-persistence task; Codex completed and verified the bounded slice locally.
