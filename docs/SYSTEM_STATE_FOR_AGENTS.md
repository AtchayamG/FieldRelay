# System State for Agents

**Updated:** 2026-07-26. Read this after `AGENTS.md` and before touching code. It describes what actually exists, not what is planned.

Authority order is unchanged: `docs/00_MASTER_BLUEPRINT.md` first, then the numbered blueprint docs, then this file for current reality, then `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md` for what remains.

## Ground truth in one paragraph

FieldRelay is a property-maintenance incident system whose distinguishing capability is that it makes real phone calls through CALL-E and gets structured answers back. It has placed a real call end to end (`docs/CALL_E_RUNTIME_PROOF.md`). The API is closed behind a session boundary, persists to PostgreSQL, and cannot place a call unless a deployment explicitly opts in. Six of fifteen designed routes are built. 258 tests pass.

## Verified commands

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres          # local database
pnpm --filter fieldrelay-api db:migrate
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`DATABASE_URL` must be set for the API tests to exercise PostgreSQL; without it 15 integration tests skip silently, which has hidden a real defect before. Always run them with a database.

Judge environment: `docker compose -f docker-compose.judge.yml up -d --build`, then `http://localhost:8080`.

## The CALL-E integration

**Design record: ADR-004** in `docs/IMPLEMENTATION_DECISIONS.md`, superseding ADR-003. Read it before changing anything in this area.

- `CallEPort` has two implementations. `DemoCallEAdapter` never dials and reports `simulated: true`. `CalleApiAdapter` calls `POST {CALLE_BASE_URL}/v1/calls` with a bearer key.
- `selectCallEAdapter()` in `app.module.ts` picks between them. **Only the exact string `live` in `CALL_E_MODE` enables dialling.** Unset, empty, `production`, a typo — all select demo. Live mode throws at boot if its configuration is missing or unsafe.
- `StartCallUseCase` asks the adapter `describe()` before creating the task, so a stored task never misreports whether it was simulated.
- The request contract was verified against the published OpenAPI document, not the README prose. `recipients` is an **array** whose entries hold a `phones` array. Getting this wrong silently breaks every call.
- Result schemas may use only `type`, `properties`, `required`, `enum`, `description` and `additionalProperties: false`. **No `$ref`, `oneOf`, `anyOf`, `allOf`, or nullable type unions.** Optional fields are expressed by omission from `required`.
- The terminal webhook envelope is `{ id, type, created_at, data }`. `id` is the *webhook event* id; the call id is at `data.id`. Confusing them binds callbacks to a non-existent task.
- `CALLE_REQUEST_TIMEOUT_MS` defaults to 45s because a live `POST /v1/calls` was measured taking longer than 15s **while still placing the call**. Do not lower it. A client timeout below the server's work window abandons a call that is already happening.

## Where a phone number may live

This is the most sensitive rule in the codebase.

- A raw number exists in exactly two places: the `CALLE_DIAL_TARGETS` environment variable, and the `runtime_settings` row an operator sets from Settings. Both are resolved by `LayeredDialTargetResolver` inside infrastructure, immediately before provider I/O.
- A number is **never** returned by an API, written to the audit trail, sent to the browser, logged, or committed. The API returns only a masked form (`••• ••• 3923`).
- `CALLE_ALLOW_RUNTIME_DIAL_TARGET` defaults to false. The judge environment sets it false so the published demo credentials cannot point the system at an arbitrary telephone.
- Every number is bound to an authorized contact, so `StartCallUseCase`'s existing purpose checks still apply to whatever an operator nominates.

## Structured call outcomes

`docs/06` calls this the point where a phone call becomes a business decision, and it is now partially built.

- `validateStructuredResult` in `application/call-outcome.ts` is a **trust boundary, not a formality**. The answer is produced by a language model transcribing a stranger on a telephone and it goes on to drive an approval about money.
- Undeclared keys are **dropped, not stored**. A model that volunteers extra fields does not get to widen the contract.
- A value outside a declared `enum` is refused rather than coerced. "maybe" never becomes a decision.
- A partial answer is kept along with `validationFailed: true`: an operator can act on it, but must know it was partial. Silently discarding the whole outcome would hide that the call happened.
- **FieldRelay's acceptance rules are deliberately stricter than the schema it sends CALL-E.** `minimum` and `maximum` are enforced locally but stripped by `toProviderSchema` before transmission, because CALL-E's documented feature list omits them and an unrecognised keyword risks the call being rejected outright. If you add a constraint, decide which side of that boundary it belongs on.
- Transcripts, recordings and the provider's free-text summary are still **not** persisted. Security doc 08 requires access controls and retention rules that do not exist yet.
- Migration `0006_call_outcomes.sql` stores one outcome per call task, keyed by `call_task_id`, so a redelivered terminal webhook overwrites rather than appending a second opinion.
- The outcome is written **inside the same transaction** that accepts the callback, so a call task can never end up terminal with its answer missing. `outcomes` therefore lives on `UnitOfWork`, unlike the dial-target settings store which is deliberately outside it.
- The audit trail records **field names only** — `fields: ['available', 'quoted_amount_text']` — never the answers. Those values came from a stranger on a telephone and do not belong in an append-only log. A test asserts the amount never appears in audit metadata.
- `call.outcome.recorded` and `call.outcome.recorded_with_validation_failure` are distinct actions, so an operator can find calls that connected but produced nothing usable.

## Safety invariants — do not weaken these

1. The call task and its idempotency reservation commit **before** any provider I/O.
2. The `Idempotency-Key` sent to CALL-E is the call task UUID and is reused across retries, so a retry can never place a second call. A throwaway script that mints a fresh task per attempt once caused a duplicate real call; the production path did not.
3. Ambiguous outcomes become `outcome_unknown` and are **never** auto-redialled.
4. Callback and webhook ingestion is replay-safe: duplicate deliveries are recognised, conflicting reuse of an event id returns 409.
5. Transcripts, recordings, structured results and raw provider payloads are discarded at the webhook boundary. Only `eventId`, `providerTaskId` and `status` survive.
6. Simulated and real calls remain visibly distinct in the UI.

## Authentication

- `SessionGuard` is a global `APP_GUARD`: **routes are closed by default**. A new controller is protected unless it carries `@PublicRoute()`.
- Four routes are public, each for a stated reason: `/health`, `POST /api/v1/auth/session`, the provider callback route (HMAC-authenticated) and the CALL-E webhook route (URL-token authenticated).
- Tokens are HMAC-SHA256, expiring, verified in constant time, with no algorithm field.
- Evaluator credentials are **published on purpose** (`ops.demo@fieldrelay.io` / `DemoOps2026!`) so judges can sign in unaided. This is an access boundary, not an identity system. What protects the call budget is `CALL_E_MODE`, not this password.

## What exists

| Area | State |
|---|---|
| Routes built | Sign-in, Mission Control, Incidents (list/detail/create), Calls (queue/detail), Settings |
| Routes designed but not built | Dispatch, Technicians, Vendor Detail, Approvals, Customers, Analytics, Audit & Consent, Knowledge Base |
| Persistence | PostgreSQL, migrations 0001–0005, in-memory unit of work for tests only |
| Mission Control | Still demo-adapter data, not API-backed |
| Deployment | Dockerfiles for API and web, `docker-compose.judge.yml`, nginx same-origin proxy with CSP |
| Tests | 258 total: API 205, app 53 (plus 2 design-token tests) |

## Traps that have already caught someone

- **Running tests without `DATABASE_URL`.** 15 tests skip silently. That hid a foreign key with no delete rule which made `call_tasks` impossible to purge (fixed in migration 0004).
- **Trusting the README over the OpenAPI document.** The prose showed a singular `recipient` object; the real contract takes a `recipients` array. Always check `https://docs.heycall-e.com/openapi/calle.openapi.yaml`.
- **Line endings.** `.gitattributes` now pins them. A Linux tool inspecting a Windows checkout once reported all 156 files as modified when the tree was clean.
- **Installing toolchain packages silently.** `winget install ... --silent` for nvm-windows removed the existing Node installation and left nothing behind. Do not silently install toolchain managers on this machine.
- **Free calls are metered and finite.** They are also what the judges will use. Never place a call to test a code change; the demo adapter and the recorded proof exist for that.

## Required handoff

Unchanged from `AGENTS.md`: report result, files changed, decisions, commands and their real output, known limitations, cleanup, risks, and the exact next task. Add an entry under `docs/agent-runs/` and update `docs/taskstatus.md` and `docs/handover.md`.
