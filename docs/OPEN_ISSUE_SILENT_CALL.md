# Open issue — the live call connects but nobody speaks

**Status: OPEN.** Raised 2026-08-10; blocks genuine phone footage for the final demo.

## Observed

Call `CALL-2042-0003` was placed through the live adapter on 2026-08-10 for authorized contact `CNS-4491`.

- The phone rang and was answered.
- CALL-E produced dead air, then the call closed.
- A 27.8-second recording contains room tone rather than speech.
- FieldRelay still shows `queued` because the deployed request supplied no webhook URL.

Do not publish the private number, transcript, recording, or raw provider payload.

## Fault A — terminal state cannot return (confirmed, ours)

Production lacks `CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN`. The deployed build therefore gives CALL-E no callback destination. This explains the stuck local status, but not the silent audio.

**Fixed locally on `codex/submission-readiness-audit`:** live mode now refuses to boot unless it receives an HTTPS webhook URL, a token of at least 24 characters, and an exact URL-token match. The adapter always sends the URL. Production still needs an approved environment update and redeploy.

Configure without printing the token:

```text
CALLE_WEBHOOK_URL=https://fieldrelay-pi.vercel.app/api/v1/call-e/webhook?token=<TOKEN>
CALLE_WEBHOOK_TOKEN=<same TOKEN>
```

## Fault B — the agent said nothing (unresolved)

The request contract is verified against the published OpenAPI shape: a non-empty disclosed task, one authorized `recipients[].phones[]` target, a supported result schema, correlation-only metadata, and the webhook URL.

The local adapter now rejects an empty composed speaking task before it resolves a phone number or contacts the provider, with regression coverage. Remaining likely explanations are:

1. The provider record shows an agent/runtime error.
2. The `en-IN` locale did not select a usable voice; compare with the earlier successful call before changing it.
3. A provider-side transient affected this call.

## Next steps, in order

1. Complete refreshed CALL-E authorization and inspect `CALL-2042-0003`: status, duration, transcript/event history, and runtime error. No new call first.
2. With user approval, add the two production webhook values and deploy the audited branch.
3. Re-run the read-only production audit.
4. Only if the provider evidence gives a concrete correction, authorize one final supervised call and film genuine handset footage.

## Safety rules

- Four metered calls have been spent and the remaining allowance is for judging.
- Never redial because FieldRelay looks stuck. A real call may have occurred even when the local status is ambiguous.
- Never create synthetic phone footage. The current 2:30 video is a **draft**, with a 17.8-second placeholder and a stale Approvals frame. `scripts/build-demo-video.mjs` now refuses the final filename unless genuine `assets/demo/phone-call.mp4` exists.
