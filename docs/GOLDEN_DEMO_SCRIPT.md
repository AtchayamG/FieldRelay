# Golden Demo Script

Target: **under 3 minutes** (Devpost limit). One scenario, start to finish, no cuts away from the running system.

Supersedes `docs/13_DEMO_SCRIPT.md` for the actual recording; that document remains the blueprint's original narrative plan.

## The one rule

**The money shot is the refusal, not the call.** Seven of fourteen winners in the reference hackathon led with what their AI would not do. Anyone can film a computer dialling a phone. Almost nobody films the system stopping itself. Budget the most screen time for the approval gate and the guardrail panel.

---

## Shot list

### 0:00–0:20 — The problem, on screen

**Visual:** Mission Control, already signed in.

> "A maintenance request is supposed to be acknowledged in 24 hours and fixed in about 48. Almost none of that is spent fixing anything — it's spent on the phone, chasing vendors who don't pick up."

Do not read the guardrail panel yet. Let it sit in frame unexplained; it earns attention later.

### 0:20–0:35 — What it does, in one sentence

> "FieldRelay makes those calls. It gets a price and an arrival time back as structured data. And then it refuses to act on any of it until a person says yes."

### 0:35–1:05 — Raise an incident, place the call

**Visual:** Incidents → New Incident → fill the form → submit → open Calls.

> "Kitchen sink leak at Oakridge, unit 12B. FieldRelay authorises the contact, checks the purpose is one this vendor is allowed to be called about, and writes a queued call task to the database *before* it dials — so if anything fails after this point, the record already exists."

**Visual:** the call appears in the queue.

### 1:05–1:35 — The phone actually rings

**Visual:** hold the phone in frame, or screen-record the incoming call. Answer it. Let two or three exchanges play.

> "That's CALL-E on a real line. It opens with a disclosure, asks whether they can take the job, when, and roughly what it costs — and it refers to the job only by reference number. The vendor never hears the tenant's name or address."

**This is the single most persuasive 30 seconds available. Do not rush it.**

### 1:35–2:05 — The answer comes back as data

**Visual:** call detail, structured outcome panel.

> "Not a transcript — a validated answer. Available: yes. Quoted: thirty-five dollars. Confidence: point eight two. Anything the model volunteered that we didn't ask for was dropped, and a value outside the declared options would have been refused rather than turned into a decision."

Point at the footnote:

> "No transcript is stored. That's deliberate, not missing."

### 2:05–2:35 — The refusal (the money shot)

**Visual:** Approvals. The approval that was raised automatically.

> "FieldRelay stopped. It raised this itself, and it says why: the vendor quoted a price. CALL-E can find out that a job costs thirty-five dollars. Only a person can agree to pay it."

Approve it, with a note.

> "That decision is recorded against my name. If the vendor's answer had changed since this was raised, the system would have refused my approval — because I'd be agreeing to something I never read."

### 2:35–2:55 — The guardrails

**Visual:** back to Mission Control, guardrail panel.

> "Everything FieldRelay refuses to do, reported live from configuration — not a marketing list. It won't redial an ambiguous outcome. It can't call a number an operator didn't provision. One authorised task can only ever place one call. And when a guardrail is relaxed" — point at the amber one — "it says so."

### 2:55–3:00 — Close

> "FieldRelay makes the calls a property manager doesn't have time to make. And it refuses to commit a rupee without them."

---

## Pre-flight checklist

Run before every take:

- [ ] Database reset and reseeded; no leftover incidents from a previous take
- [ ] `CALL_E_MODE=live`, dial target set to the phone that will be on camera
- [ ] Phone on silent-but-visible, screen-recording started
- [ ] Signed in already — do not spend demo time on a login screen
- [ ] Browser zoom set so text is legible at video resolution
- [ ] **No credentials, tokens, `.env` file or real personal data anywhere on screen**
- [ ] Notifications and unrelated tabs closed

## Reliability gate

- [ ] Five consecutive clean runs from a reset state
- [ ] One run where the vendor **declines** — proves the "unavailable" path
- [ ] One run rehearsed with `CALL_E_MODE=demo`, as a fallback if the live call fails on the day
- [ ] Fallback recording captured and stored before the deadline

## Failure plan

If the live call fails while recording: **do not edit around it.** Either re-run, or keep it and narrate it — "the call didn't connect, so the task is sitting in `outcome_unknown`, and FieldRelay will not redial it automatically. A person decides what happens next." A visible failure handled correctly is worth more than a cut.

## What to leave out

- The nine unbuilt routes. Do not scroll past a disabled nav item.
- Architecture diagrams. The write-up carries those; the video shows the system.
- Any figure not in `docs/PROBLEM_EVIDENCE.md`.
- Apologies for scope. State what it does; the honest-limits section belongs in the write-up.
