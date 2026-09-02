# Live-call readiness recheck — 2026-08-16

## Result

FieldRelay's public application, authentication, database-backed behavior, live-mode wiring, and
CALL-E account/tool access are healthy. A new live phone conversation was not placed and is not
claimed as verified. The latest production live call remains a provider-diagnostics blocker because
it rang with silence.

## Read-only production evidence

- `GET /health`: 200.
- Published demo session exchange: 200; authenticated session introspection: 200.
- Mission Control: `mode: live`, three incidents, two calls in flight, four real calls placed.
- Dial-target settings: configured for authorized contact `CNS-4491`, region `IN`, locale `en-IN`,
  runtime changes allowed.
- Vendor boundary: one callable authorized contact and three deliberately non-callable examples.
- Existing real task `CALL-2042-0003`: provider id present, status still `queued`, no outcome.
- Unsigned `POST /api/v1/call-e/webhook`: 401, proving the public callback boundary is protected.
- Official CALL-E CLI: authentication usable; `plan_call`, `run_call`, and `get_call_run` available.

## Verification

- API: 303/303 tests passed with the locally mirrored production PostgreSQL URL, including all 15
  integration tests.
- App: 133/133 tests passed.
- Design tokens: 2/2 tests passed.
- ESLint: passed.
- Strict TypeScript: passed.
- Production build: passed; Vite reports the existing large-main-chunk warning.
- `npx impeccable detect apps/fieldrelay-app/src --no-config`: zero findings.

The first database run pointed at the stopped local PostgreSQL service and failed with
`ECONNREFUSED`; Docker Desktop was unavailable. The required rerun used the existing ignored
production environment mirror without printing the connection string and passed all 303 API tests.

## Decisions and limitations

- No new CALL-E call was placed. Project safety rules reserve metered calls for judges and prohibit
  using a real call as a change test.
- The hardened deployment now requires and sends its webhook URL, closing the known callback
  omission for future calls.
- The silent-audio fault is not explained by that webhook fix. CALL-E support or a read-only REST
  call lookup must inspect the provider record before any supervised retry.
- The July 25 runtime proof remains valid evidence of a separate completed, structured live call;
  it is not evidence that every future call will speak successfully.

## Files changed

- `docs/taskstatus.md`
- `docs/handover.md`
- `docs/SYSTEM_STATE_FOR_AGENTS.md`
- `docs/agent-runs/2026-08-16-live-call-readiness-recheck.md`

## Cleanup and next task

The temporary Vercel environment export was deleted; no secret or provider payload was printed or
persisted. Next, ask CALL-E support to inspect the REST call id recorded in
`docs/OPEN_ISSUE_SILENT_CALL.md`. Do not redial first.
