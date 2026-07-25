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

## Contract verification (second pass, same day)

The first pass built the adapter from the repository README's prose examples. The published OpenAPI document was then read directly (`https://docs.heycall-e.com/openapi/calle.openapi.yaml`, CALL-E Developer API v0.6.0, OpenAPI 3.1.0) and corrected three things the prose had wrong or left out:

1. **`recipients`, not `recipient`.** The create-call body takes an array of recipient objects, each with its own `phones` array — not a single `recipient` object with one `phone`. The first implementation would have been rejected by the API.
2. **The webhook envelope nests the call.** `WebhookEvent` is `{ id, type, created_at, data }`, where `id` is the *webhook event* id and the call id lives at `data.id`. Reading the root `id` as the call id — which the first implementation did — would have bound every callback to a provider task that does not exist. `type` is one of `call.completed`, `call.failed`, `call.result_validation_failed`; there is no `status` field on the envelope.
3. **Schema features are restricted.** `$ref`, `oneOf`, `anyOf`, `allOf` and `additionalProperties: true` are unsupported, and nullable type unions such as `["string", "null"]` are not among the supported features. The call briefs now express optional fields by omission from `required`, and every decision field is a string enum carrying an explicit `unknown` branch, which is what CALL-E's own guidance recommends over booleans.

Confirmed enums: `CallStatus` is `queued | in_progress | completed | failed | canceled`; `AttemptStatus` adds `dialing`. `call.result_validation_failed` is treated as a completed call with an unusable result rather than a failure, because the conversation did happen.

## Credential and connectivity proof

- A developer API key was created self-service at `https://dashboard.heycall-e.com/account/api-keys` (free, two keys per account, 90-day default expiry, full key shown once). It was moved into the git-ignored `.env` via the clipboard and never written to a tracked file.
- Base URL `https://api.heycall-e.com` confirmed live and the key confirmed valid by a read-only probe that places no call:
  - `GET /v1/calls/does-not-exist` with the key returns `404 {"error":{"code":"not_found","message":"Call not found."}}`
  - the same request with an invalid key returns `401 {"error":{"code":"unauthorized","message":"Invalid or missing API key."}}`
- This supersedes the earlier conclusion that no REST credential was obtainable. The MCP surface is therefore not needed as an integration path, and ADR-004 stands unchanged in intent.

## Known limitations

- No real call has been placed yet. Authentication and the request contract are verified, but the create-call path is unexercised end to end until a call is approved. `CALL_E_MODE` remains `demo`.
- Structured call outcomes are still not ingested. CALL-E returns `structured_result`, `task_completed` and `completion_confidence` on terminal webhooks and the webhook translator deliberately discards all of them. The approval and dispatch loop depends on ingesting them through a schema-validated path with its own access controls.
- The webhook route is authenticated by a bearer token in the URL because the OpenAPI document defines no signing scheme for `POST /calle/webhook`. If CALL-E publishes one, it should replace this.
- `GET /v1/goals` returns a plain 404, so the goals and goal-runs surfaces appear not to be deployed in this beta tier even though they are documented.

No real call, publication, deployment, or production mutation occurred.
