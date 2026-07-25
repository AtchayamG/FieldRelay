# Implementation Decisions

Record approved deviations from the blueprint using: issue, affected module, requirement, decision, reason, risk and approver.

## ADR-001 — Thin vertical slice before broad routes

- **Affected:** Entire implementation
- **Requirement:** Roadmap and product strategy require a working CALL-E workflow before broad mock screens.
- **Decision:** Build shell, incidents, CALL-E boundary, approval, dispatch, and audit as the first integrated slice.
- **Reason:** Produces judge-visible proof early and avoids disconnected placeholder pages.
- **Risk:** Remaining routes start later; mitigated by reusable tokens and shell.
- **Approval owner:** Blueprint-authorized implementation decision

## ADR-004 — CALL-E is called directly from the API through its developer API

- **Supersedes:** ADR-003
- **Affected:** `CallEPort` implementations, call briefing, webhook ingestion, environment contract
- **Requirement:** Devpost judges "CALL-E imported and actually called at runtime, not just referenced". `docs/06` requires a vendor-neutral adapter; `docs/08` requires credentials and raw numbers to stay out of the database and out of every API response.
- **Decision:** `CalleApiAdapter` calls `POST {CALLE_BASE_URL}/v1/calls` with a bearer credential, sending the call brief, recipient, `result_schema` and `webhook_url`. CALL-E reports lifecycle transitions to a token-authenticated webhook route that translates them into the existing replay-safe callback pipeline. `CALL_E_MODE` selects the adapter and defaults to demo.
- **Reason:** ADR-003 assumed the only CALL-E surface was an operator-held MCP connector. The hackathon resource pages show a documented Phase 1 developer API whose contract lines up with what FieldRelay already built: it takes an `Idempotency-Key` per call, which FieldRelay already generates exactly once per authorized call; it takes a `result_schema`, which the blueprint already specified as `expectedOutcomeSchema`; and it posts to a `webhook_url`, which the callback pipeline already handles idempotently. A direct adapter is both simpler than a bridge and a stronger technical claim.
- **Risk:** The API is in beta, so response shapes may change. Mitigated by defensive parsing (unrecognised payload → provider error → non-redialable `outcome_unknown`, never a silent success), bounded request timeouts, a bounded response size, and a status map whose default is `queued` rather than any terminal state.
- **Consequences:** Phone numbers live only in `CALLE_DIAL_TARGETS` in the deployment environment, resolved inside infrastructure immediately before dialling. The webhook route is the first authenticated boundary in the API. Structured call results are deliberately *not* ingested by this slice; they need a schema-validated path with its own access controls.
- **Approval owner:** User, 2026-07-25

## ADR-003 — CALL-E executes through an operator bridge, not from the API process (superseded by ADR-004)

- **Affected:** `CallEPort` implementations, call dispatch persistence, provider callback ingestion, deployment topology
- **Requirement:** Devpost requires CALL-E to be used at runtime. `docs/06` requires a vendor-neutral adapter boundary, and `docs/08` requires that credentials and raw phone numbers never reach the application database or any API response.
- **Decision:** The API never dials. `StartCallUseCase` persists the queued call task, and a `BridgeCallEAdapter` records an authorized dispatch request instead of performing provider I/O. A separate operator bridge process claims dispatch requests over an authenticated endpoint, executes them through the CALL-E connector (`plan_call` → `run_call` → `get_call_run`), and reports lifecycle transitions back through the existing HMAC-signed `POST /api/v1/call-e/callbacks` endpoint. The bridge owns the CALL-E credential and the contact-ID → E.164 allowlist; neither exists in the application database.
- **Reason:** The available CALL-E connector is an MCP surface held by an operator session rather than a machine-to-machine API the server can hold a credential for. Modelling that honestly as a bridge keeps the port boundary intact, reuses the replay-safe callback pipeline already built and tested, and produces the strongest security story: the application can authorize and audit a call it is structurally incapable of placing itself.
- **Risk:** Two moving parts instead of one, and a dispatch request can sit unclaimed. Mitigated by bounded claim leases, bounded attempt counts, and the existing stale-reservation reconciliation, which resolves abandoned work to `outcome_unknown` without ever enabling a redial.
- **Consequences:** Requires migration `0004_call_dispatch.sql`, a `CallDispatchRepositoryPort`, a `CALL_E_MODE` switch defaulting to `demo`, and authenticated bridge claim/report endpoints — the first authenticated boundary in the API, which seeds Track 2.
- **Approval owner:** User, 2026-07-25

## ADR-002 — Avoid speculative infrastructure in foundation

- **Affected:** API queue, object storage, realtime
- **Requirement:** Architecture requires replaceable asynchronous boundaries.
- **Decision:** Define ports and persistence-backed job state first; add external broker/object storage only when the working slice needs them.
- **Reason:** Keeps the hackathon build operable while preserving Clean Architecture boundaries.
- **Risk:** Scaling is deferred, not removed.
- **Approval owner:** Blueprint-authorized implementation decision
