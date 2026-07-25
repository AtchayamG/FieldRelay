# Implementation Decisions

Record approved deviations from the blueprint using: issue, affected module, requirement, decision, reason, risk and approver.

## ADR-001 — Thin vertical slice before broad routes

- **Affected:** Entire implementation
- **Requirement:** Roadmap and product strategy require a working CALL-E workflow before broad mock screens.
- **Decision:** Build shell, incidents, CALL-E boundary, approval, dispatch, and audit as the first integrated slice.
- **Reason:** Produces judge-visible proof early and avoids disconnected placeholder pages.
- **Risk:** Remaining routes start later; mitigated by reusable tokens and shell.
- **Approval owner:** Blueprint-authorized implementation decision

## ADR-003 — CALL-E executes through an operator bridge, not from the API process

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
