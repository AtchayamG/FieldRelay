# Structured Outcome Ingestion — 2026-07-26

## Result

CALL-E's structured answer is now validated, persisted and audited. This is the step that turns a completed phone call into data the product can act on, and it unblocks Approvals and Dispatch.

## What was built

- `application/call-outcome.ts` — `validateStructuredResult`, `readConfidence`, `toProviderSchema`, and the `CallOutcomeRepositoryPort`.
- `infra/database/migrations/0006_call_outcomes.sql` — one outcome per call task.
- PostgreSQL and in-memory repository implementations, both on `UnitOfWork`.
- `CalleWebhookTranslator` now carries the structured result forward instead of discarding it, while continuing to discard transcripts, recordings, the recipient's number and the provider's free-text summary.
- `ProcessProviderCallbackUseCase` validates and stores the outcome inside the same transaction that accepts the callback, and appends an audit event.

## Key decisions

1. **Validation is a trust boundary, not a formality.** The value is produced by a language model transcribing a stranger on a telephone and goes on to drive an approval about money. Undeclared keys are dropped rather than stored; out-of-enum values are refused rather than coerced into a decision.
2. **A partial answer is kept, flagged.** `validationFailed: true` alongside whatever validated. Discarding the whole outcome would hide the fact that the call happened at all, which an operator needs to see.
3. **FieldRelay's acceptance rules are stricter than the schema it sends.** `minimum`/`maximum` are enforced locally and stripped by `toProviderSchema` before transmission, because CALL-E's documented feature list omits them and an unrecognised keyword risks the call being rejected outright. Found while testing: `-5` is a valid integer but not a valid ETA.
4. **Outcome and acceptance share a transaction.** A call task must never be terminal with its answer missing, so `outcomes` sits on `UnitOfWork` rather than beside it.
5. **The audit trail records field names, never values.** `fields: ['available', 'quoted_amount_text']` is enough to reconstruct what was asked without copying a telephone conversation into an append-only log.

## Verification

- `pnpm lint`, `pnpm typecheck`: PASS.
- `pnpm --filter fieldrelay-api test`: PASS — 232 passing, 15 PostgreSQL-dependent skipped without a local database.
- New coverage: schema validation including undeclared keys, enum violations, type mismatches, oversized strings, missing required fields and non-object payloads; confidence bounds and rounding; provider-schema stripping; and a six-case end-to-end ingestion suite asserting that the transcript, summary and recipient number never reach storage or the audit trail.

## Known limitations

- The outcome is not yet exposed on the call detail API or rendered in the UI.
- No approval workflow consumes it yet.
- Migration 0006 has not been applied to the deployed Neon database.
- Transcripts and recordings remain unpersisted pending the access controls and retention rules security doc 08 requires.

No real call was placed for this work.
