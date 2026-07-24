# FieldRelay Agent Rules

Read `docs/00_MASTER_BLUEPRINT.md` first. Follow the authority order in that document and the repository root request. Mockups are implementation references, not inspiration.

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

## Required handoff

Report: result, files changed, decisions, commands/tests, known limitations, cleanup, risks, and the exact next task.
