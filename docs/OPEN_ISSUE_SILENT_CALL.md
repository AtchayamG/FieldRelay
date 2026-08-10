# Open issue — the live call connects but nobody speaks

**Status: OPEN.** Blocks the demo video's most important segment. Raised 2026-08-10.

## What happened

`CALL-2042-0003` was placed against the live CALL-E adapter on 2026-08-10 at 13:42 UTC to the provisioned target (contact `CNS-4491`, ending `3923`, region IN, locale `en-IN`).

- The phone **rang**. The integration reached the telephone network.
- The call was **answered**.
- **Nothing was said from CALL-E's end.** Dead air.
- The call **closed itself** after a short period.
- Recording evidence: 27.8s clip, audio `mean_volume -30.7 dB`, `max_volume -10.1 dB` — that is room tone, not speech.
- FieldRelay's record for the call is **still `queued`** with no outcome, days later.

## Two separate faults, do not conflate them

### Fault A — no status ever comes back (CONFIRMED, ours, easy)

`CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN` are **not set in Vercel production**. Verified with `npx vercel env ls production`; only `CALLE_DIAL_TARGETS`, `CALL_E_MODE`, `CALLE_API_KEY`, `CALLE_BASE_URL` are present.

In `calle-api.adapter.ts` the webhook URL is spread conditionally:

```ts
...(this.config.webhookUrl ? { webhook_url: this.config.webhookUrl } : {})
```

With the variable unset, **no `webhook_url` is sent at all**, so CALL-E has nowhere to report the terminal event. The call task can therefore never leave `queued`, no outcome is ever stored, and no approval is ever raised — regardless of how well the call itself goes.

This fully explains the stuck status. **It does not explain the silence.**

**Fix:** set both variables in Vercel production and redeploy.

```
CALLE_WEBHOOK_URL=https://fieldrelay-pi.vercel.app/api/v1/call-e/webhook?token=<TOKEN>
CALLE_WEBHOOK_TOKEN=<TOKEN>
```

Generate a long random token; the same value goes in both, since the route authenticates on the `token` query parameter (or the `x-calle-webhook-token` header). Do not print it to a terminal.

### Fault B — the agent said nothing (UNDIAGNOSED, possibly theirs)

The request body we send is believed correct — it was rebuilt against the published OpenAPI document, not the README prose:

```ts
{
  task: `${brief.disclosure}\n\n${brief.goal}`,
  recipients: [{ phones: [E164], region, locale }],
  result_schema: toProviderSchema(brief.resultSchema),
  metadata: { call_task_id, call_display_id, purpose }
}
```

`task` carries the disclosure and the goal, so the agent has something to say. Candidate causes, in order of likelihood:

1. **`locale: 'en-IN'` may not have a usable voice.** The earlier successful call (`call_MzD1ou1AbX1XtYkTnxMCBA`, recorded in `CALL_E_RUNTIME_PROOF.md`) is the control case — check which region/locale it used. If it differs, this is almost certainly the cause. **Try `en-US` first; it is a one-field change in Settings.**
2. **`brief.goal` or `brief.disclosure` resolved empty** for `vendor_availability`, producing a `task` string of just a newline. Log the composed `task` length locally before sending — do not log its contents.
3. **A CALL-E-side failure** on the agent runtime. Nothing in our code can cause or fix this.

## What to do next, in this order

1. **Read the CALL-E dashboard for this call.** It should show status, duration, and a transcript. That single step separates "we sent a bad request" from "their agent failed", and nothing else here should be attempted before it. Nobody has looked yet.
2. **Set the two webhook variables** (Fault A). Independent of Fault B and worth doing regardless.
3. **Assert `task` is non-empty** in `startCall` before posting, throwing `CallValidationError` if it is. A call that says nothing still costs a call and a person's time.
4. **Only then place one more test call**, after changing locale to `en-US`.

## Rules that still apply

- **The allowance is finite and reserved for judges.** Four have been spent. Do not place a call to test a code change; the demo adapter exists for that.
- **Never retry a call that looks stuck.** A client timeout already caused a duplicate dial once, and this call proves a call can complete on CALL-E's side while our record still reads `queued`. Redialling on a stale local status is exactly how it happens again.
- The current demo video (`assets/demo/fieldrelay-demo.mp4`, 2:30) has a **17.8-second placeholder** at beat 4 for phone footage. It is submittable without it, but that segment is the strongest thirty seconds available and stays empty until this is resolved.
