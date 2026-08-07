# CALL-E Feedback Survey — draft answers

For the **Most Valuable Feedback** prize (5 winners × $200 + 10,000 credits). Judged on *actionable* feedback, so every item below names the specific behaviour, what it cost, and the concrete fix.

**Form:** https://call-e.devpost.com/details/feedback

Everything here is drawn from real integration work recorded in `docs/taskstatus.md` and `docs/SYSTEM_STATE_FOR_AGENTS.md`. Nothing is invented.

> **Fill in yourself:** name, Devpost username, CALL-E account email, and the two 1–10 scales. Check the interface list against what you actually used.

---

## Did you start a project for this hackathon after July 23, 2026?

**Yes**

## Which CALL-E interfaces did you use?

**API** — the production integration is the Developer REST API (`POST /v1/calls`) behind a port, with a token-authenticated webhook for terminal events.

**MCP** and **CLI** — used during initial exploration to verify credentials and place the first test call before the REST integration was written.

> Confirm SKILL/SDK — I don't believe either was used.

---

## What is a calling-related problem you face on a regular basis?

Chasing service vendors by phone to answer three questions: can you take this job, when can you come, and what will it cost.

It is never one call. A vendor doesn't pick up, so you leave a message, wait, call the next one, and then call the original person back with a time you aren't confident about. The work is trivial and the coordination is not — the cost is entirely in the waiting and the re-dialling, not the conversation. A single job routinely takes four or five calls spread over a day, and none of them can be delegated to a text message because vendors answer phones and ignore forms.

The specific gap: there is no way to ask a question by phone *at scale* and get an answer back in a shape a system can act on. Voicemail and call logs are not data.

## Pain scale

> Your call. **7** would be defensible — genuinely disruptive, but not blocking.

---

## What bugs or issues did you run into while using CALL-E?

Seven, ordered by what they cost.

### 1. A client timeout caused a duplicate real call, and the docs gave no way to anticipate it

`POST /v1/calls` has no documented expected latency. We set a 15-second client timeout, which is generous for most APIs. CALL-E had already accepted the request and dialled; our client gave up, the retry path constructed a fresh task and therefore a fresh idempotency key, and **the recipient's phone rang twice.**

That cost a call from a metered allowance and made a real person answer the same automated call twice.

**Fix:** document expected p50/p99 latency for `POST /v1/calls`, and state explicitly in the integration guide that **a client-side timeout does not mean the call was not placed.** One sentence would have prevented this. Consider also returning `202 Accepted` with a task id as early as possible, so acceptance and completion are clearly separate events.

### 2. The README contradicts the OpenAPI specification on the request shape

The integration guide shows a singular `recipient` object. The published OpenAPI document takes a `recipients` **array**, whose entries carry their own `phones` **array**.

We built the former first, from the prose, and it was wrong. This was only caught by reading the spec directly.

**Fix:** make the OpenAPI document the single source of truth, generate the prose examples from it, or at minimum add a banner to the guide saying which wins.

### 3. The webhook envelope nests the call id, and it's easy to bind to the wrong one

The terminal webhook has an **event** id at the root and the **call** id nested at `data.id`. Reading the root `id` as the call identifier is the obvious mistake, and it silently attaches every callback to a provider task that does not exist — no error, just nothing ever reconciles.

**Fix:** publish a complete annotated webhook payload showing both levels, with a one-line warning that the root id is the event, not the call. Deduplication should key on the event id; correlation should key on `data.id`. Saying so explicitly would save people a confusing afternoon.

### 4. No webhook signing scheme is published

There is no documented way to verify that a webhook delivery genuinely came from CALL-E. We had to fall back to authenticating the route with a token embedded in the URL, which is meaningfully weaker: URLs land in logs, proxies, and browser history in a way that a header signature does not.

**Fix:** publish an HMAC signature header with a timestamp, in the shape Stripe and GitHub use. This is the single change that would most improve the security posture of every integration built on CALL-E.

### 5. No balance or quota endpoint

The API exposes no way to read remaining calls. We wanted to show operators how much allowance was left and could not, so we ended up displaying **calls placed** instead and explaining in our README why the more useful number was unavailable.

**Fix:** a `GET /v1/account/usage` returning allowance, consumed, and remaining. This is table stakes for anything metered, and its absence forces every integrator to guess or to say nothing.

### 6. The free-call allowance is stated inconsistently across your own properties

The Devpost page says **20 free calls**. heycall-e.com says **200**.

For a hackathon where the allowance directly constrains what people build and how much they can test, this is worth more than it looks — we deliberately under-tested rather than risk running out.

**Fix:** state it in one place and link everywhere else to that place.

### 7. `result_schema` doesn't document which JSON Schema keywords it honours

We needed bounds on an integer field (`earliest_eta_hours` — `-5` is a valid integer and an invalid ETA). It was unclear whether `minimum`/`maximum` would be honoured, silently ignored, or cause the whole call to be rejected.

Not knowing which, we enforced the bounds locally and **stripped them before transmission** — defensive, and slightly absurd, since it means our validation is deliberately stricter than the schema we send you.

**Fix:** document the supported keyword subset explicitly, and state what happens to an unrecognised keyword. "Unknown keywords are ignored" is a perfectly good answer; not knowing is the problem.

---

## What would have given you a better experience with the documentation?

Five things, roughly in order of how much time each would have saved:

1. **One authoritative reference.** The OpenAPI document is correct and the prose is not, but the prose is what a new integrator reads first. Generate the examples from the spec, or say plainly which one wins when they disagree.

2. **A "things that will surprise you" page.** Every non-trivial API has three or four behaviours that are obvious in hindsight and expensive to discover. For CALL-E those are: acceptance latency versus completion, the webhook envelope nesting, what `Idempotency-Key` does and does not protect, and the supported `result_schema` subset. One page would have saved us most of a day.

3. **Precise `Idempotency-Key` semantics.** What is the retention window? What happens when the same key arrives with a different body — 409, or the original result? Does it protect against the timeout scenario in issue 1, or only against literal duplicate submissions? We guessed conservatively and reused our own task UUID, which turned out right, but we were guessing.

4. **A complete worked example, end to end.** Place a call, receive the terminal webhook, read the structured result — with the real payloads at every step, including the nesting. Fragments per-endpoint make you reassemble the shape yourself, and that is exactly where mistakes 2 and 3 came from.

5. **State the failure modes.** What happens on an unreachable number, a busy line, a voicemail pickup, a hang-up mid-conversation? We had to design for `outcome_unknown` defensively without knowing whether CALL-E distinguishes these, because the documentation describes the happy path.

---

## How likely are you to use CALL-E in the future?

> Your call. **8** is honest if you'd use it again — the platform did the hard part well; the gaps above are documentation and observability, not capability.

---

## Is there any other feedback you'd like to provide?

**The core product works, and it works better than expected.** Our first real call returned exactly the structured result we declared — `{ available: "yes", quoted_amount_text: "$35" }` at 0.82 confidence — with our own task IDs round-tripped through metadata. That is genuinely impressive and it is the hard part. Everything above is polish around something that already does the difficult thing.

Three things we'd like to see, in priority order:

**1. Webhook signatures (repeating from above, because it matters most).** Everything else on this list costs developers time. This one costs them security posture, and every integrator inherits the same weakness.

**2. Treat "the call may already have happened" as a first-class documented state.** The single most dangerous condition in any system that spends money is an operation whose outcome is unknown. We built our whole architecture around refusing to auto-retry an ambiguous outcome, and we'd have got there faster if CALL-E's docs had named the condition and said what guarantees exist around it.

**3. A sandbox mode that reaches no telephone.** We built our own demo adapter behind a port so we could develop without spending calls, and I suspect every serious team did the same. A first-party `mode: "simulate"` that returns a realistic structured result without dialling would save that duplicated effort and stop people burning metered calls on integration testing.

**One design note as a compliment:** requiring `result_schema` up front is the best decision in the API. It forces the integrator to decide what a valid answer looks like *before* the call, which is what makes the output trustworthy afterwards. Please don't add a "just give me the transcript" convenience mode that lets people skip it — the constraint is the feature.

---

## Are you open to being contacted?

**Yes** — and worth saying yes. It's a young team asking, and the follow-up conversation is a better outcome than the prize.

---

## Discord

Strongly encouraged by the form and plausibly a factor in judging. https://discord.gg/SDcGdhgRzj → `#support`

Post the bugs section — items 1, 3 and 4 are the ones other participants will hit and thank you for. Then paste the thread link into the form's Discord field.
