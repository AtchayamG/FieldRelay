# CALL-E Runtime Proof

**Date:** 2026-07-25 (18:27–18:30 UTC)
**Claim evidenced:** FieldRelay imports CALL-E and calls it at runtime to complete a real-world task — the Devpost "Technical Implementation" criterion.

## What ran

FieldRelay's own application path, unmodified, driving the production adapter:

1. `CreateIncidentUseCase` created incident `INC-2042-0001` (fictional demo data).
2. `StartCallUseCase` resolved contact `CNS-4491` through `ContactAuthorizationPort` and confirmed it was authorized for the `vendor_availability` purpose.
3. It reserved an idempotency key and persisted a queued call task, `CALL-2042-0001`, **before** any provider I/O.
4. `briefForPurpose` produced the goal, the mandatory disclosure and a closed result schema.
5. `selectCallEAdapter` returned `{ mode: 'live', simulated: false }` from `CALL_E_MODE=live`.
6. `CalleApiAdapter` resolved the dial target from `CALLE_DIAL_TARGETS` and issued `POST https://api.heycall-e.com/v1/calls` with bearer auth and the call task's UUID as the `Idempotency-Key`.

Persistence was the in-memory unit of work rather than PostgreSQL, because Docker was not running on the workstation. Every other component — use cases, ports, adapter, brief, dial-target resolver, mode selection — was the one that serves production traffic.

## Result returned by FieldRelay

```json
{
  "callTaskId": "a172c322-7224-4832-a096-636b3abb7838",
  "displayId": "CALL-2042-0001",
  "providerTaskId": "call_MzD1ou1AbX1XtYkTnxMCBA",
  "status": "queued",
  "simulated": false,
  "replayed": false
}
```

## Terminal call record returned by CALL-E

```json
{
  "id": "call_MzD1ou1AbX1XtYkTnxMCBA",
  "status": "completed",
  "structured_result": { "available": "yes", "quoted_amount_text": "$35" },
  "task_completed": true,
  "completion_confidence": { "score": 0.82, "label": "high" },
  "metadata": {
    "purpose": "vendor_availability",
    "call_task_id": "a172c322-7224-4832-a096-636b3abb7838",
    "call_display_id": "CALL-2042-0001"
  },
  "failure_code": null,
  "failure_message": null,
  "created_at": "2026-07-25T18:27:56.297167Z",
  "completed_at": "2026-07-25T18:30:30.647722Z",
  "recipient_status": ["completed"]
}
```

## What this demonstrates

- **The call happened.** A real phone rang, a conversation took place, and the call reached `completed` with `task_completed: true`.
- **The result is structured and actionable, not a transcript.** `available: "yes"` and `quoted_amount_text: "$35"` came back conforming to the closed schema FieldRelay declared for the `vendor_availability` purpose. That is the difference between a phone call and a workflow step.
- **The call is correlated.** FieldRelay's `call_task_id` and `call_display_id` round-tripped through `metadata`, so the provider record maps back to exactly one authorized task.
- **The safety boundary held.** The task was durable before dialling, the contact was authorized for that specific purpose, and the person who answered heard only the opaque reference `CALL-2042-0001` — never the incident UUID, the property, or the tenant.
- **Confidence is reported, not assumed.** `completion_confidence` of 0.82 / `high` is the signal an approval policy should gate on rather than trusting any answer equally.

## Defect found and fixed by this run

The first attempt timed out client-side after 15 seconds. `POST /v1/calls` had in fact been accepted and the call was dialled anyway; the proof script then retried with a freshly generated call task, and therefore a fresh `Idempotency-Key`, which placed a **second real call**. One metered call was wasted and the recipient was called twice.

Two things follow:

1. `DEFAULT_TIMEOUT_MS` is raised from 15s to 45s. A client timeout shorter than the server's own work window abandons a call that is already in progress.
2. The production path was never at risk of this: `StartCallUseCase` uses the call task's UUID as the `Idempotency-Key` and reuses it across attempts, so CALL-E collapses a repeat. Only the throwaway proof script minted a new identity per run. That script now refuses to run without an explicit `--i-understand-this-places-a-real-call` flag.

## Cost discipline

Free calls are finite and are also what the judges will use to evaluate the submission. No further proof calls should be placed; this record is the evidence. Demo recordings should reuse this call's data or the demo adapter.
