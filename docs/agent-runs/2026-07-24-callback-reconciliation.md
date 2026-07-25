# Callback and Reconciliation Agent Run — 2026-07-24

## Routing

- The bounded provider-callback and stale-reservation task was executed in an isolated worktree (`codex/worker-callback-reconciliation`).
- Codex reviewed the diff, reproduced the checks, and integrated the result onto `codex/devpost-foundation` on 2026-07-25.

## Accepted result

### Authenticated provider callbacks

- HMAC-SHA256 verification over `<timestamp>.<exact raw request bytes>` using `CALLBACK_SIGNING_SECRET`, with constant-time comparison.
- Rejects missing or weak secrets (<16 characters), malformed signature hex, and timestamps outside a 300-second sliding window.
- Raw-body capture enabled in `main.ts` and in the e2e test bootstrap so signatures are computed over exact bytes.
- Bounded DTO: `eventId`, `providerTaskId`, and a status in `ringing | connected | completed | failed | no_answer`. Transcript, outcome, and payload blobs are explicitly refused.
- Idempotent acceptance returns HTTP 202. Exact replays return 202 with `Idempotency-Replayed: true` and create no duplicate state or audit events. Conflicting reuse of an event ID returns HTTP 409.
- Persists only normalized fields plus a SHA-256 payload hash in `provider_callbacks`; raw bodies and envelopes are never stored.
- The asynchronous processor enforces forward-only transitions (`queued -> ringing -> connected -> completed/failed/no_answer`), treats same-state delivery as a no-op, and reconciles terminal callbacks against `outcome_unknown`. Unknown provider tasks and regressive transitions are recorded as bounded rejected outcomes with append-only audit events and no payload leakage.

### Durable stale-reservation reconciliation

- Migration `0003_call_callbacks.sql` adds a `call_task_id` reference to `operation_idempotency` (deferrable, initially deferred) and the `provider_callbacks` table.
- `startCall` durably links its pre-generated `callTaskId` to the `call.start` idempotency reservation on initial claim.
- `ReconcileStaleReservationsUseCase` queries `in_progress` `call.start` reservations older than a supplied cutoff, bounded to a hard maximum of 100 per run.
- Matching queued call tasks move atomically to `outcome_unknown`, idempotency records complete with replayable sanitized results, and `call.reservation.reconciled_queued_task` audit events are appended.
- No redial is possible. Missing or already-terminal tasks resolve deterministically as `reconciled_missing_task` or `reconciled_existing_status`.

## Key decisions

1. **No weak admin HTTP trigger.** The repository has no authenticated internal boundary yet, so reconciliation ships as an independently testable application use case wired into `AppModule`. Periodic scheduling is deliberately deferred rather than exposed on an unauthenticated route.
2. **Nest raw-body capture.** `{ rawBody: true }` in `NestFactory.create` and in the testing module preserves exact bytes for signature computation.
3. **Deferred foreign key.** `call_task_id` on `operation_idempotency` uses `DEFERRABLE INITIALLY DEFERRED` so the reservation claim and task insert commit cleanly in one transaction.

## Verification

- `pnpm --filter fieldrelay-api lint`: PASS.
- `pnpm --filter fieldrelay-api typecheck`: PASS (strict, 0 errors).
- `pnpm --filter fieldrelay-api build`: PASS.
- `pnpm --filter fieldrelay-api test` (2026-07-25 integration re-run, no local PostgreSQL): 96 passed, 15 PostgreSQL-dependent tests skipped, 0 failures across 9 executed suites.

## Known limitations carried forward

- No periodic runner invokes `ReconcileStaleReservationsUseCase` yet (tracked as G13).
- No live CALL-E adapter exists; nothing currently produces these callbacks (tracked as G1).
- Local Node 22.9 remains below the repository's `>=22.12` engine requirement (tracked as G6).

No real call, publication, deployment, or production mutation occurred.
