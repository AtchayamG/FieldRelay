# CALL-E Live Integration Run — 2026-07-25

## Routing

- Codex researched the official hackathon resource pages and the `CALLE-AI/call-e-integrations` repository, then implemented and verified the slice directly on `codex/call-e-bridge`.

## Research findings that changed the design

- CALL-E exposes a documented Phase 1 developer API, not only an operator-held MCP connector: `POST /v1/calls`, `GET /v1/calls/{id}`, `GET /v1/calls/{id}/events`, and a terminal-result webhook.
- The create-call contract accepts `Idempotency-Key`, `result_schema`, `metadata` and `webhook_url` — a near one-to-one fit with the idempotency, expected-outcome and callback machinery FieldRelay already had.
- New accounts receive 20 free calls, so a real-call proof does not depend on a commercial agreement.
- The submission deadline is 2026-09-14 23:45 SGT. The earlier AM/PM ambiguity is resolved by the official overview header.
- Submission requires a pull request to `CALLE-AI/awesome-phone-call-agents`, a public sub-three-minute video, and the CALL-E account email.

ADR-003's operator bridge was therefore superseded by ADR-004 before any bridge code was written.

## Accepted result

- `CalleApiAdapter` calls the CALL-E developer API with bearer auth, a per-task idempotency key, the call brief, the recipient, the result schema and the webhook URL.
- `CALL_E_MODE` selects the adapter. Any value other than the exact string `live` selects the demo adapter, and live mode refuses to boot without valid configuration.
- `briefForPurpose` builds the goal, mandatory disclosure and a closed result schema from the call purpose. The person who answers hears only an opaque call display ID; the incident UUID is never transmitted.
- `EnvDialTargetResolver` reads dial targets from `CALLE_DIAL_TARGETS` and validates E.164, region and locale at boot. No phone number is stored in the database or in this repository.
- A token-authenticated CALL-E webhook route translates provider deliveries into the existing callback pipeline, discarding transcripts, recordings and structured results, and deriving deterministic event IDs so duplicate deliveries collapse into recognised replays.
- `ProcessProviderCallbackUseCase.acceptVerified` is now shared by both ingestion paths, so replay safety cannot drift between them.
- `StartCallUseCase` records the adapter's declared `simulated` flag instead of a hardcoded `true`, so a task can never claim to be simulated while a live provider is wired in.

## Verification

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS (strict, all five projects).
- `pnpm test`: PASS — 198 tests (API 144, app 52, tokens 2); 15 PostgreSQL-dependent tests skipped without a local database.
- `pnpm build`: PASS. The Node engine warning is gone after the toolchain moved to Node 24.18.0 LTS.

## Known limitations

- No real call has been placed. The live path is unexercised against the real service until a CALL-E API key and an authorized test number are provisioned.
- Response and webhook shapes were built from the published examples; the full API reference is a client-rendered page that could not be read directly, so field names are parsed defensively rather than assumed.
- Structured call outcomes are still not ingested. The approval and dispatch loop depends on this and remains open.
- The webhook route is authenticated by a bearer token in the URL because CALL-E's Phase 1 webhook does not document a signing scheme. If a signature scheme exists, it should replace this.

No real call, publication, deployment, or production mutation occurred.
