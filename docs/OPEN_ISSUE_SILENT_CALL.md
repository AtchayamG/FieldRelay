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

The deployed build gave CALL-E no callback destination. This explains the stuck local status, but not the silent audio.

**Fault A closed for future calls:** live mode refuses to boot unless it receives an HTTPS webhook URL, a token of at least 24 characters, and an exact URL-token match. Matching encrypted production values and the hardened adapter were deployed and verified on 2026-08-10. This cannot retroactively update `CALL-2042-0003`.

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

1. Complete the newest pending CALL-E broker authorization/exchange and inspect `CALL-2042-0003`. The prior authorized exchange returned provider-side HTTP 502 twice; a later retry timed out and generated a new pending session. No new call first.
2. Fault A needs no further code or deployment work; confirm only through the next authorized supervised call after Fault B is understood.
3. Re-run the read-only production audit.
4. Only if the provider evidence gives a concrete correction, authorize one final supervised call and film genuine handset footage.

## Safety rules

- Four metered calls have been spent and the remaining allowance is for judging.
- Never redial because FieldRelay looks stuck. A real call may have occurred even when the local status is ambiguous.
- Never create synthetic phone footage. The current 2:30 video is a **draft**, with a 17.8-second placeholder and a stale Approvals frame. `scripts/build-demo-video.mjs` now refuses the final filename unless genuine `assets/demo/phone-call.mp4` exists.
