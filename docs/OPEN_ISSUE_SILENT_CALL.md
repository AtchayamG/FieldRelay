# Open issue — the live call connects but speech starts too late

**Status: EXTERNALLY BLOCKED, PROVIDER STARTUP DELAY CONFIRMED.** Raised 2026-08-10; narrowed by authenticated provider inspection on 2026-09-02.

## Observed

Call `CALL-2042-0003` was placed through the live adapter on 2026-08-10 for authorized contact `CNS-4491`.

- The phone rang and was answered.
- The recipient heard dead air after answering and reasonably reported the call as silent.
- CALL-E's authenticated call record now shows that the bot eventually spoke, but not until about
  23 seconds into a 45-second billed call. The initial dead-air window is the user-visible failure.
- FieldRelay originally remained `queued` because the historical request supplied no webhook URL.
  The deployed read-only reconciliation action corrected it on 2026-09-02.

Do not publish the private number, transcript, recording, or raw provider payload.

## Fault A — terminal state cannot return (confirmed, ours)

The deployed build gave CALL-E no callback destination. This explains the stuck local status, but not the silent audio.

**Fault A closed for future calls:** live mode refuses to boot unless it receives an HTTPS webhook URL, a token of at least 24 characters, and an exact URL-token match. Matching encrypted production values and the hardened adapter were deployed and verified on 2026-08-10. This cannot retroactively update `CALL-2042-0003`.

**Lost-webhook recovery deployed and applied on 2026-09-02:** an authenticated operator can now
check an existing non-terminal live task against `GET /v1/calls/{id}`. The response identity is
validated and the terminal state is applied through the same replay-safe transaction as a webhook.
This action cannot place or retry a call and retains no number, transcript, summary, evidence, or
recording. `CALL-2042-0003` reconciled once to provider status `completed`, with the bounded outcome
showing `taskCompleted: false`; schema validation passed.

Configure without printing the token:

```text
CALLE_WEBHOOK_URL=https://fieldrelay-pi.vercel.app/api/v1/call-e/webhook?token=<TOKEN>
CALLE_WEBHOOK_TOKEN=<same TOKEN>
```

## Fault B — the provider started speech after about 23 seconds (confirmed, unresolved)

The request contract is verified against the published OpenAPI shape: a non-empty disclosed task, one authorized `recipients[].phones[]` target, a supported result schema, correlation-only metadata, and the webhook URL.

The local adapter rejects an empty composed speaking task before it resolves a phone number or contacts the provider, with regression coverage. The 2026-09-02 provider record proves that the disclosed maintenance prompt reached the voice runtime and was spoken. It therefore rules out an empty task and makes `en-IN` voice selection failure unlikely. The remaining defect is provider/runtime startup latency before the first bot turn.

The public CALL-E create-call contract documents `task`, recipients, region, locale, result schemas,
metadata and webhook URL. It does not document a greeting, voice-start, or latency-control field that
FieldRelay can set. Do not invent one or change the locale without provider evidence.

## Provider inspection result — 2026-08-10

The refreshed broker authorization completed successfully and the CALL-E CLI token is usable. Production correlates this task to REST provider id `call_FGQ5pBxDDlbwBhOdSu5LFQ`.

The authenticated MCP catalogue exposes `plan_call`, `run_call`, and the read-only `get_call_run`. It does not expose a REST-call lookup. Passing the persisted REST `call_id` to `get_call_run` safely returns `FAILED` with `message: run_id not found.` This is a namespace/API-surface mismatch, not evidence that the telephone call itself failed: the phone rang and the recording exists.

No phone number, transcript, recording, credential, or raw payload was printed or persisted during the investigation. No call was placed.

## Authenticated provider inspection — 2026-09-02

- The September monthly-usage email and CALL-E billing page independently show one August call:
  India, 45 seconds, and USD 0.05.
- Filtering the authenticated CALL-E Call records page by the emailed call identifier found the same
  attempt. It ended `ByRobot` after 45 seconds.
- The conversation-detail timeline shows recipient-line audio activity before the first bot turn and
  the first bot speech beginning at approximately 23 seconds. The bot then delivered FieldRelay's
  maintenance-reference question and the session ended without a usable answer.
- No provider error, failure code, or application-controlled setting explaining the 23-second startup
  delay is exposed in that view.

The inspection was read-only. No raw phone number, verbatim transcript, recording, credential, or
provider payload was copied into the repository, and no call was placed.

## Next steps, in order

1. Ask CALL-E support to inspect REST call `call_FGQ5pBxDDlbwBhOdSu5LFQ` and its corresponding
   45-second dashboard attempt, specifically why the first bot audio began around 23 seconds after
   connection. Request a documented mitigation or confirmation that this was transient.
2. Only if provider evidence gives a concrete correction, authorize one final supervised call and
   film genuine handset footage. The stale FieldRelay status is already repaired; this does not fix
   the provider's delayed first audio.

## Safety rules

- Four metered calls have been spent and the remaining allowance is for judging.
- Never redial because FieldRelay looks stuck. A real call may have occurred even when the local status is ambiguous.
- Never create synthetic phone footage. The obsolete 2:30 draft and placeholder builder are not
  submission assets. The published 2:59.861 walkthrough uses authentic application screens,
  explicitly labels simulated and historical-live evidence, and makes no claim that a fresh handset
  conversation succeeded.
