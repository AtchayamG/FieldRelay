# FieldRelay Agent Rules

Read `docs/00_MASTER_BLUEPRINT.md` first, then **`docs/SYSTEM_STATE_FOR_AGENTS.md`**, which describes what actually exists today, the CALL-E contract details that are easy to get wrong, and the traps that have already caught people. Follow the authority order in the blueprint and the repository root request. Mockups are implementation references, not inspiration.

## Non-negotiable call safety

- Only the exact value `live` in `CALL_E_MODE` may enable dialling. Never widen that check.
- A raw phone number may exist only in `CALLE_DIAL_TARGETS` or the `runtime_settings` row, and only inside infrastructure. Never return, log, persist, or commit one.
- The call task and its idempotency reservation commit before any provider I/O, and the idempotency key is the call task UUID reused across retries.
- Ambiguous outcomes stay `outcome_unknown` and are never auto-redialled.
- Free CALL-E calls are metered and are what the judges will use. Never place a real call to test a change — use the demo adapter.
- Run the test suite with `DATABASE_URL` set. Without it, 15 integration tests skip in silence.

## Delivery rules

- Build a working vertical slice before broad screen coverage.
- Keep dependencies pointing inward: presentation -> application -> domain; infrastructure implements domain/application ports.
- Domain code must not import Angular, Ionic, Capacitor, NestJS, HTTP, persistence, browser storage, or CALL-E implementation types.
- Keep CALL-E credentials server-side. Real calls require an authorized allowlisted contact, explicit purpose, disclosure policy, bounded retries, idempotency, and an audit event.
- Keep demo/simulated calls visibly distinct from real calls.
- Use centralized design tokens; feature styles must not contain literal theme colors.
- Implement loading, empty, degraded, permission, validation, and error states.
- Preserve dark/light parity and desktop/tablet/mobile capability.
- Prefer existing code, platform features, and installed dependencies. Add the smallest abstraction that has a real boundary.

## Working rules

- Inspect `docs/taskstatus.md`, `docs/handover.md`, and Git status before edits.
- Touch only assigned files. Do not perform drive-by refactors.
- Never commit secrets, personal phone numbers, raw transcripts, build output, caches, reports, or temporary screenshots.
- Put disposable output only in ignored `.tmp/`, `test-results/`, `playwright-report/`, `coverage/`, or `screenshots/current/`.
- Run focused tests and report commands/results. Treat generated demo data as fictional and deterministic.
- Do not publish, deploy to production, open the upstream submission PR, or submit Devpost without explicit user approval.

## Documentation is part of every step, not the end of the task

Update the shared agent docs when each step completes, not once at the finish. A step is not done until they reflect it:

- `docs/SYSTEM_STATE_FOR_AGENTS.md` — what now exists, and any new trap or boundary another agent could get wrong
- `docs/taskstatus.md` — a dated line recording the outcome and its verification
- `docs/handover.md` — current state, highest-priority next task, live blockers
- `docs/agent-runs/` — a run record for a substantial slice

## Required handoff

Report: result, files changed, decisions, commands/tests, known limitations, cleanup, risks, and the exact next task.
