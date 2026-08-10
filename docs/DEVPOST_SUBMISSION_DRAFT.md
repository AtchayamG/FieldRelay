# Devpost Submission — Draft

Refusal-first, per the verified winning pattern. Every figure traces to `docs/PROBLEM_EVIDENCE.md`. Nothing here claims a capability FieldRelay does not have.

---

## Tagline

> **FieldRelay makes the calls a property manager doesn't have time to make — and refuses to commit a rupee without them.**

## Inspiration

A maintenance request is supposed to be acknowledged within 24 hours and resolved within about 48. Almost none of that window is spent fixing anything. It is spent on the telephone: calling a plumber who doesn't pick up, leaving a message, waiting, calling the next one, then calling the tenant back with a time you aren't sure of.

NARPM's Code of Ethics obliges members to *"respond promptly to requests for repairs."* Responsiveness isn't a service preference in this industry — it's a professional obligation. And the cost of missing it isn't a complaint: one in three negative resident reviews traces to upkeep, and maintenance is consistently among the top reasons tenants leave. The window closing means a vacancy.

Every tool built for this problem so far organises the work. None of them make the call.

**We asked: what if the calls just got made — and the only thing a manager had to do was say yes or no?**

## What it does

FieldRelay turns a maintenance incident into a phone call, and the phone call back into a decision.

1. An operator raises an incident — a leak in unit 12B.
2. FieldRelay checks the contact is authorised **for that specific purpose**, reserves an idempotency key, and writes a queued call task to the database **before dialling**.
3. CALL-E phones the vendor on a real line. It opens with a disclosure, asks whether they can take the job, when, and what it costs — and refers to the job only by an opaque reference number. The vendor never hears a tenant's name or address.
4. The answer comes back as **structured data validated against a schema FieldRelay declared when it placed the call**: `available: yes`, `quoted_amount_text: $35`, confidence `0.82`.
5. FieldRelay **stops** and raises an approval, stating why: a price was quoted.
6. A human approves. That decision is recorded against their name, permanently.

The real call we placed returned exactly that, in about two and a half minutes: `{ available: "yes", quoted_amount_text: "$35" }`, `task_completed: true`, confidence `0.82 / high`. Evidence in `docs/CALL_E_RUNTIME_PROOF.md`.

## What it refuses to do

This is the part we care most about.

Anyone can build an agent that makes a phone call. The engineering that matters is everything the system declines:

- **It will not dial a number no operator provisioned.** Numbers live in deployment configuration or a validated Settings entry — never in the database, never in this repository.
- **It will not dial at all** unless `CALL_E_MODE` is exactly `live`. Unset, empty, or a typo selects the demo adapter. No environment starts calling by accident.
- **It will not redial an ambiguous outcome.** A call whose result is unknown becomes `outcome_unknown` and waits for a person. There is no automatic retry path in the codebase.
- **It will not place two calls for one authorised task.** The idempotency key is the call task's UUID, reused across retries.
- **It will not store a transcript, a recording, or the caller's number.** The provider returns them; the webhook boundary discards them.
- **It will not accept an answer it didn't ask for.** Undeclared fields are dropped. A value outside the declared options is refused, not coerced — "maybe" never becomes a decision.
- **It will not let one person's approval overwrite another's**, and it will not accept a decision made against an answer that changed after the approval was raised.
- **It will not write a phone answer into the audit log.** The audit records field *names*; the values came from a stranger on a telephone.

Mission Control opens with these, reported live from configuration. When a guardrail is relaxed, the panel says so in warning colour. **A safety claim that cannot be false is not a claim.**

## How we built it

**Clean Architecture, enforced.** Domain imports nothing — no NestJS, no HTTP, no persistence, no CALL-E types. Dependencies point inward. CALL-E sits behind `CallEPort` with two implementations selected by configuration.

- **Frontend** — Angular 20 / Ionic, standalone components, centralised design tokens, dark and light parity.
- **API** — NestJS, PostgreSQL, eight migrations, transactional unit of work.
- **CALL-E** — the Developer API (`POST /v1/calls`) with bearer auth, a per-task idempotency key, a purpose-derived brief carrying a mandatory disclosure, and a closed `result_schema`.
- **Ingestion** — a token-authenticated webhook feeding a replay-safe callback pipeline with HMAC-signed provider callbacks, timestamp windows and event deduplication.
- **Deployment** — Vercel: static SPA plus the whole API in one serverless function on the same origin, Neon PostgreSQL. Session-guarded by default; an anonymous request to any data route returns 401.

**438 tests.** Not coverage theatre — they encode the refusals. There is a test asserting a leaked phone number never reaches storage, one asserting a quoted amount never appears in the audit trail, and regression coverage for exact live-mode selection, mandatory webhooks, empty speaking tasks, and PostgreSQL behavior.

## Challenges we ran into

**A 15-second timeout that cost a real call.** Our client abandoned `POST /v1/calls` after 15s. CALL-E had already accepted it and dialled. The retry generated a fresh call task — and therefore a fresh idempotency key — and the recipient's phone rang twice. Default raised to 45s. The production path was never exposed to this, because `StartCallUseCase` reuses the call task UUID as the key; only a throwaway proof script minted a new identity per run.

**A foreign key with no delete rule.** Migration 0003 referenced `call_tasks` from `operation_idempotency` without `ON DELETE`. Call tasks became unpurgeable — any retention job would have failed. Found only because we ran the PostgreSQL suite, which had been silently skipping 15 tests for want of a local database. Fixed with `ON DELETE SET NULL`: the replay guard is *supposed* to outlive the task it guards.

**The README disagreed with the API.** The integration guide showed a singular `recipient` object. The published OpenAPI document takes a `recipients` **array** whose entries carry a `phones` array. We had built the former. Reading the spec directly also revealed the webhook envelope nests the call at `data.id` beneath an event-level `id` — reading the root `id` would have bound every callback to a provider task that doesn't exist.

**Our validation is stricter than the schema we send.** `-5` is a valid integer but not a valid ETA. So FieldRelay enforces `minimum`/`maximum` locally and strips them before transmission, because CALL-E's documented feature list omits those keywords and an unrecognised one risks the whole call being rejected.

## Accomplishments

- **A real call, placed by the application itself** — not by a CLI, not by a person — returning a schema-conforming structured result with FieldRelay's own task IDs round-tripped through provider metadata.
- **The refusal inventory above**, all of it built and tested rather than described.
- **HMAC-authenticated, replay-safe webhook ingestion** with timestamp windows and event deduplication.
- **A live deployment judges can use**, with a separate demo adapter and an exact-value live switch so dialing cannot be enabled by a typo.

## What we learned

**Restraint is the hard part.** Getting an AI to make a phone call took an afternoon. Getting it to reliably *not* do things — not redial, not store, not decide, not accept an answer it didn't ask for — took the rest of the project. That asymmetry is the whole lesson.

**Ambiguity is a state, not an error.** A call that may or may not have happened is the single most dangerous thing in a system that spends money. Naming it `outcome_unknown` and refusing to act on it was the most valuable design decision we made.

## What's next

Every navigation route is now implemented, including the human approval and dispatch loop. Next we would add automated accessibility and visual-regression testing, reduce the framework entry chunk, and replace URL-token webhook authentication if CALL-E publishes a signing scheme.

## Built With

Angular · Ionic · TypeScript · NestJS · PostgreSQL · Neon · Vercel · CALL-E Developer API · Docker

## Links

- **Live demo:** https://fieldrelay-pi.vercel.app — sign-in pre-filled, one click
- **Repository:** https://github.com/AtchayamG/FieldRelay
- **Real call evidence:** `docs/CALL_E_RUNTIME_PROOF.md`

---

## Pre-submission checklist

- [x] Upstream PR to `CALLE-AI/awesome-phone-call-agents` — **approved and merged**, [PR #107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107), contributed to `skills/` as `service-dispatch-call`
- [ ] Public video under 3 minutes on YouTube or Vimeo
- [ ] CALL-E account email
- [ ] Age / country / conflict attestations
- [x] Screenshots: Mission Control with guardrails, call detail with outcome, Approvals, Dispatch, Vendors
- [x] Architecture diagram
- [ ] Re-read the rules for late changes
