# FieldRelay — Winning Strategy

Applies the `hackathon-winning-strategy` skill to FieldRelay. Evidence base: the **verified winner set** of UiPath AgentHack 2026 — 14 winners out of 203 entries, identified by Devpost's Winner tag, plus a full read of Nexus Maestro (confirmed *Most Creative Solution*), a multi-agent phone-calling system almost identical in shape to FieldRelay.

## 1. The headline finding

**Seven of the fourteen winners led with what their AI would not do.**

> "…**refuses to heal real bugs**, filing a defect instead. The testing agent that **knows when not to heal**." — SelfHeal QA
> "AI investigates. **Human decides.** Patients stay protected." — Vigilance Q
> "**proves** vulnerabilities **instead of just flagging** them" — Penetron
> "developers **only decide, never dig**" — SpectreAI

In a field where every entrant can call an LLM, capability is not a differentiator. Restraint is.

**This is FieldRelay's strongest asset and it is currently invisible.** The refusals are in the code and the commit messages; they are not in the product's own voice.

## 2. FieldRelay's refusal inventory

Everything below is already built and tested. No winner in the reviewed set had a list this long.

| Refusal | Where |
|---|---|
| Will not dial a number no operator provisioned | `EnvDialTargetResolver`, `LayeredDialTargetResolver` |
| Will not dial at all unless `CALL_E_MODE` is exactly `live` | `selectCallEAdapter` |
| Will not redial an ambiguous outcome, ever | `outcome_unknown`, no retry path |
| Will not place a second call for one authorized task | idempotency key = call task UUID |
| Will not store a transcript, recording or caller's number | webhook translator discards them |
| Will not accept an answer field it did not ask for | `validateStructuredResult` drops undeclared keys |
| Will not turn "maybe" into a decision | out-of-enum values refused, not coerced |
| Will not let one person's approval overwrite another's | second decision refused |
| Will not accept a decision made against a superseded answer | staleness check on `outcomeReceivedAt` |
| Will not let a caller name someone else as the approver | approver taken from the signed session |
| Will not write a phone answer into the audit log | audit records field names only |

**The refusal sentence:**

> FieldRelay will not commit a rupee, redial a number, or store a word of a conversation without a person deciding first.

## 3. Positioning

Winners use one memorable word plus a mechanism-and-contrast tagline. FieldRelay already has the word.

**Recommended tagline:**

> **FieldRelay makes the calls a property manager doesn't have time to make — and refuses to commit a rupee without them.**

**Alternates:**

> An AI that phones your vendors, gets a price, and then asks permission — because only a person should agree to pay it.

> Every maintenance call, made and logged. Every commitment, human-approved.

**The quotable line, in the Nexus Maestro mould** ("voice agents that never decide"):

> CALL-E speaks. FieldRelay decides what it may say, what it may keep, and what it must ask a human before doing.

## 4. Scorecard

| Dimension | Weight | Score | Weighted | Note |
|---|---:|---:|---:|---|
| Real problem with sourced cost | 18 | 3 | 10.8 | Problem is real; **numbers not yet sourced** |
| Refusal/accountability story | 16 | 5 | 16.0 | Exceptional — needs surfacing, not building |
| Sponsor platform load-bearing | 15 | 5 | 15.0 | Real call placed; adapter behind a port; webhook ingestion |
| Golden demo under the limit | 14 | 2 | 5.6 | **Not scripted or rehearsed** |
| Judge-visible surface | 12 | 2 | 4.8 | **Mission Control still demo data** |
| Technical depth | 12 | 5 | 12.0 | Idempotency, replay safety, audit, 369 tests |
| Memorability | 7 | 3 | 4.2 | Good name, tagline not yet chosen |
| Honest limits | 6 | 5 | 6.0 | Consistently labelled throughout |
| **Total** | | | **74.4** | Competitive; three fixable gaps hold it back |

Every point lost is in **narrative and demo**, not engineering. That is the cheapest kind of gap to close.

## 4a. Status of the three gaps (2026-08-06)

| Gap | State |
|---|---|
| Judge-visible surface | **Closed.** Mission Control reads real state and opens with the guardrail panel |
| Sourced numbers | **Closed.** `docs/PROBLEM_EVIDENCE.md`, tiered by source quality |
| Rehearsed golden demo | **Scripted**, `docs/GOLDEN_DEMO_SCRIPT.md`. Still needs five clean runs and a fallback recording |

Revised score: **~92/100**, with the remainder resting on rehearsal and the write-up rather than on code.

## 5. The three gaps

### Gap 1 — No judge-visible surface (12 points)

The confirmed winner built a "War Room" dashboard for the express purpose of letting judges *see* the orchestration. Agentic work is invisible: validation, refusals, state transitions. If a judge cannot see it, it did not happen.

FieldRelay's Mission Control — the first screen a judge sees — still renders demo-adapter data.

**Fix:** wire the metrics and incident queue to real data, and add a live call lifecycle strip showing queued → ringing → connected → completed → outcome validated → approval raised, with the refusals annotated as they fire. This is the single highest-value remaining build.

### Gap 2 — No sourced numbers (7.2 points)

Compare the winner's opening: *"76% of AP departments were targeted in 2024, with average losses between $47K–$130K per incident… investigating takes 2–4 days… the recall window is 24–48 hours. Most organizations miss it."*

FieldRelay needs the equivalent for property maintenance: how many hours a week a manager spends on the phone, typical vendor response delay, cost of an SLA breach or an escalated tenant complaint.

**Fix:** find two or three real, citable figures. **Do not invent them** — a fabricated statistic is the fastest way to lose a technical judge.

### Gap 3 — No rehearsed golden demo (8.4 points)

**Fix:** script one scenario end to end — incident created → call placed → real phone rings → structured answer returns → approval raised because it quotes a price → human approves → audit trail shown. Under three minutes. Five clean runs from a reset state. Record a fallback.

## 6. Direct competitive claims

Two things FieldRelay can say that the confirmed winner could not:

1. **"Webhook authentication — HMAC signatures — (demo endpoints are currently unauthenticated)"** appears in their *future work*. FieldRelay shipped HMAC-signed, replay-safe, timestamp-windowed callback authentication weeks ago.
2. They report "no simulated calls, no mocked responses." FieldRelay matches that with a **recorded, reproducible artefact** — `CALL_E_RUNTIME_PROOF.md`, with the call ID, the structured result and the confidence score.

## 7. Submission narrative skeleton

1. **Tagline** — refusal-led, from §3
2. **Opening** — prevalence → cost → current duration → the window that closes → the failure (needs §5 Gap 2 numbers)
3. **The pivot** — "What if the calls just got made, and the only thing a manager had to do was say yes or no?"
4. **Golden scenario** — numbered beats, one incident, start to finish
5. **Architecture** — Clean Architecture, the port boundary, CALL-E as the phone execution layer
6. **The refusal principle** — §2 as a design philosophy, not a feature list
7. **Challenges** — named defects and fixes: the 15s timeout that abandoned an accepted call and cost a duplicate dial; the foreign key with no delete rule that made call tasks unpurgeable; the `recipients` array the README got wrong
8. **Accomplishments** — led by the real call and its `$35` structured result
9. **Learned** — the outcome schema stricter than the one sent to the provider, and why
10. **Future work** — honest: nine routes unbuilt, Mission Control partly illustrative, no accessibility automation
11. **Links** — live app, repo, proof document

## 8. Sequenced plan

| Order | Work | Points |
|---|---|---:|
| 1 | Mission Control on real data + call lifecycle strip | +12 |
| 2 | Source the problem statistics | +7 |
| 3 | Script and rehearse the golden demo | +8 |
| 4 | Rewrite the Devpost narrative refusal-first | +3 |
| 5 | Dispatch (completes the loop visually) | breadth |
| 6 | Remaining routes | breadth |

Projected: **~105 of 100 before breadth work** — i.e. the ceiling is reachable without building another screen beyond Mission Control.

## 9. Rules carried forward

- Never invent a metric, integration, deployment or test result.
- Separate verified winners from gallery entries when citing evidence.
- Popularity is not the criterion: four verified winners had zero likes. Do not campaign for votes.
- Draft the submission while building, not at the end — it exposes gaps early.
