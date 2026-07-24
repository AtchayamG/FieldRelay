# Call Persistence Agent Run — 2026-07-24

## Routing

- Claude Code 2.1.207 with the user-authenticated Opus 4.8 session received the bounded call-persistence task in an isolated worktree.
- The CLI stopped at the account monthly spend limit after only a partial aggregate edit.
- Codex reviewed the partial design, retained the useful durable lifecycle direction, and completed the migration, repositories, use cases, controllers, contracts, and tests locally.

## Accepted result

- A queued call-task row and the winning idempotency reservation commit atomically before provider I/O.
- Provider I/O runs outside a database transaction.
- Successful simulated outcomes update the task, complete idempotency, and append an audit event atomically.
- Ambiguous failures persist `outcome_unknown`, keep the key claimed, and never enable automatic redial.
- `GET /api/v1/calls` and `GET /api/v1/calls/:callTaskId` provide bounded read access with optional status/incident filters and cursor pagination.
- Stored/API data excludes raw phone numbers, transcripts, raw provider payloads, and idempotency keys.

## Verification

- Workspace lint, strict typecheck, production build, and production dependency audit pass.
- PostgreSQL-backed workspace run: 121/121 tests pass.
- Fresh Compose database reports both migrations, the `call_tasks` table, and three deterministic fictional seed incidents.
- PostgreSQL tests cover insert/read/update/filter, optimistic versioning, rollback behavior inherited from the shared unit of work, and incident foreign-key enforcement.

No real call, publication, deployment, or production mutation occurred.

## Known limitations

- Only the explicit demo CALL-E adapter is wired.
- Provider callbacks, reconciliation tooling, stale-reservation operations, organization scoping, and call UI remain.
