# Handover

Last updated **2026-08-07**. If you are picking this up cold, read this file, then `docs/SYSTEM_STATE_FOR_AGENTS.md` (what exists), then `docs/DESIGN_SYSTEM.md` (how the UI must look and why). Those three are the contract.

## Current state

`main` is green and deployed. A session-protected incident and call system that has placed a **real CALL-E call end to end**, now carrying a committed visual identity.

| | |
|---|---|
| Live | https://fieldrelay-pi.vercel.app — sign-in pre-filled, one click |
| Repo | https://github.com/AtchayamG/FieldRelay |
| Upstream PR | **[#107 — open and mergeable](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107)** |
| Verification | lint clean, strict typecheck clean, **418 tests** (283 API + 133 app + 2 tokens), production build passes |
| Design detector | `npx impeccable detect apps/fieldrelay-app/src` reports **zero** |
| Deadline | 2026-09-14 23:45 SGT |

15 PostgreSQL-dependent API tests skip without a local database. Run one to exercise them; they have caught a real defect before.

## READ THIS FIRST — the one open blocker

**A live call connects, rings, is answered, and then nobody speaks.** See `docs/OPEN_ISSUE_SILENT_CALL.md`. It blocks the demo video's strongest segment and it is the highest-priority item in the project.

Two faults, deliberately separated in that document:

- **Fault A, confirmed and ours:** `CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN` are **not set in Vercel production**, so no `webhook_url` is sent and CALL-E can never report a terminal event. Every live call is stuck at `queued` forever. Easy fix, do it regardless.
- **Fault B, undiagnosed:** the agent said nothing on the call. **Nobody has read the CALL-E dashboard for `CALL-2042-0003` yet.** That is step one and it separates "we sent a bad request" from "their agent failed".

**Do not place another test call before reading that dashboard.** Four calls are spent from a finite allowance reserved for judges.

## Read the real judging criteria before prioritising anything

This matters more than any internal scorecard. The hackathon judges on **four equal criteria**:

1. **Real World Impact** — a specific phone-work problem, credibly solved, worth building further. Explicitly *not* a generic "AI that makes phone calls".
2. **Quality of the Idea** — non-obvious use of CALL-E, and *"is the contribution clear, well-scoped, and **reusable by the community**?"* — which is why PR #107 is scored work, not a checkbox.
3. **Technical Implementation** — *"CALL-E imported and **actually called at runtime**, not just referenced."* `docs/CALL_E_RUNTIME_PROOF.md` answers this directly.
4. **Product Experience & Demo** — a coherent experience **and a demo video that communicates it**.

The earlier "92/100" figure was scored against the internal playbook in `docs/WINNING_STRATEGY.md`, **not** against these criteria. Treat it as a heuristic, not a score.

Prizes split **Most Practical ($4,000)** and **Most Innovative ($3,000)**. FieldRelay is a practical use case; the write-up should aim there rather than straddle.

## What landed most recently (2026-08-07)

### Brand and design system — committed direction: **Machined Graphite**

Read `docs/DESIGN_SYSTEM.md` before touching any UI. Summary of what changed and why:

- **New logo, "Signal and Gate"** (`shared/components/logo/logo.component.ts`). An incident sends a call outward as two arcs; the call stops against a solid bar. The mark is the product thesis. It replaced a lightning bolt in a rounded-square tile on a purple-to-cyan gradient — three of the most-named tells of generated UI stacked in one 38px box.
- **Inter and JetBrains Mono retired for Geist and Geist Mono.** Inter is the single most recognisable typographic tell. Both verified available on Google Fonts.
- **Dark palette moved from blue-black to warm graphite**, every accent desaturated a step so nothing glows. `--fr-color-signal` is the one accent and it is **rationed** — it marks live state and nothing else.
- **Tray construction** added: outer shell + inner core with concentric radii (`--fr-tray-radius`, `--fr-tray-radius-inner`), hairlines instead of 1px gray, shadows tinted to the canvas hue, one easing curve (`--fr-ease`).
- **All 12 impeccable detector findings cleared.** 11 were the same tell — `side-tab`, a thick coloured border down one card edge. State now travels as a labelled dot or as the text itself.

### Two honesty defects fixed on the judge's first screen

Both were found by *looking at the deployment*, not by reading fixtures. Do this.

1. **Orchestration Flow rendered a hardcoded badge reading `INC-2026-9041 Pipeline` above an empty body** — a fake incident reference over a blank box, because the API adapter returned an empty array. It now derives all seven steps from the most recent real call task, and says so when the system stopped itself.
2. **The performance panel reported `SLA Compliance (0%)`** for rates nothing had ever measured — a struct default rendered as a claim that the system meets its SLA zero percent of the time. It now states which measurement each rate is waiting on.

There is a general rule in both: **a zero is not the absence of a number, it is a claim.**

## Where the work stands

### Built — every route in the navigation now works

Sign-in · Mission Control · Incidents list/detail/create · Calls queue/detail · Approvals · **Dispatch Board** · **Technicians** · **Vendors** · **Analytics** · Settings

**There are no disabled navigation items left.** The loop is closed end to end: incident → call → validated answer → human approval → released dispatch.

### Technicians and Analytics — why they look sparse, on purpose

These were the two screens most likely to be padded with invented data, so both are built the other way round. Do not "improve" them by adding figures.

- **Technicians derives its roster from `reportedBy` on real incidents.** Everyone listed has actually done something; every number is a count of rows. Somebody who has not raised an incident does not appear, and the screen says so. The alternative — a seeded list of fictional staff with availability and utilisation bars — would have filled the screen and meant nothing.
- **Analytics returns counts and refuses to compute a rate.** No percentage, average or projection appears anywhere in the response, and `insights.spec.ts` **fails if a percent sign ever shows up in the payload**. This is the corrected form of the `SLA Compliance (0%)` defect.
- **What cannot be measured is named**, with what it is waiting on, because a missing metric reads as an oversight while a stated one reads as a boundary.
- Simulated calls are counted apart from real ones so they can never inflate a figure about real work, and a call that connected but produced an unusable answer is counted apart from one that returned nothing.

When there is enough history to divide by, add the rate **with its denominator beside it** — never a bare percentage.

### Vendors, and the invariant it must keep

The screen exists to make two refusals legible without an operator having to trigger a failure: *"will not dial a number nobody provisioned"* and *"a contact authorised for one purpose cannot be called about another."*

- **The endpoint returns whether a number exists, never the number.** `ListVendorsUseCase` coerces the resolver result to a boolean on the line it reads it, so nothing downstream is given the chance to read a digit. A test asserts no digits appear in the response. Do not relax this to "just the last four" — Settings already does that, and this screen has no reason to.
- **Read-only, permanently.** Authorization is consent given by a vendor and recorded out of band. An endpoint that let an operator grant themselves permission to call somebody would defeat the boundary the screen displays.
- **Non-callable contacts are shown, not filtered.** They are the evidence. The demo contact set deliberately covers authorised-with-number, authorised-without-number, pending, and revoked, so every refusal path is on screen. Live it reads **1 of 4 callable**.

### Where the dialled number comes from

Two sources, no third. Documented for judges in the README.

1. **`CALLE_DIAL_TARGETS`** — the environment default, format `contactId=+E164|REGION|locale`. Set in Vercel production. Was missing until 2026-08-07, when the deployed default was living only in `runtime_settings` and a database reset would have left no call target at all.
2. **Settings → Live call target** — the runtime override, gated by `CALLE_ALLOW_RUNTIME_DIAL_TARGET`. **`true` on the public demo** so a judge can point it at their own phone. The README previously claimed this was off; it was wrong and is fixed.

The real number lives in `.env` and Vercel only. It is deliberately not in the repository, and the README documents how to configure without printing it.

### Dispatch, and why it is built the way it is

Dispatch is the only object in the domain that creates an obligation to pay someone. Everything before it is reversible; a vendor who has been told to attend cannot be un-told. Read `domain/dispatch.entity.ts` before changing anything here.

- It **cannot exist** against a pending or rejected approval.
- **One approval releases exactly one dispatch**, enforced by a `UNIQUE` constraint on `approval_id`. An application-level check would be a race; both exist, and the lookup only turns a repeat into a no-op instead of a database error.
- The **vendor is read from the call task**, never the request body. Nothing a caller sends can redirect a job to a vendor who was never called.
- The **quoted amount is never parsed.** It is carried as spoken, dropped entirely if the answer failed validation, and never written to the audit trail — only whether one existed.
- **Releasing is a separate action from approving.** Approving records agreement to a cost; releasing sends someone. One click doing both would mean a vendor travels the instant a box is ticked.
- `DispatchInvariantError` is a **409, not a 400** — the request was well-formed, the state said no.

### Agreed sequence (user-approved 2026-08-07)

Design system → rebuild existing screens → 4 new routes → polish → **film last**. The demo is shot once, at the end, against the finished app. Do not record before the redesign lands or it is shot twice.

## Highest-priority task right now

Rebuild the remaining existing screens onto the tray construction, then build Dispatch Board.

**But the single largest scoring gap is still the demo video** — a full quarter of the judged criteria, currently unrecorded. Everything else is refinement of work already scored well.

## Free money currently being left on the table

**"Most Valuable Feedback" — 5 winners at $200 plus 10,000 credits**, requiring only the CALL-E feedback survey. The material is already gathered the hard way and nobody else will have it:

- The README documents a singular `recipient` object; the OpenAPI spec takes a `recipients` **array** whose entries carry a `phones` array.
- The webhook nests the call at `data.id` beneath an event-level `id`. Binding to the root `id` attaches every callback to a task that does not exist.
- No balance endpoint exists, so remaining-call counts cannot be shown.
- The free-call allowance is stated as **20 on Devpost** and **200 on heycall-e.com**.
- No webhook signing scheme is published, forcing URL-token authentication.
- Unsupported JSON Schema keywords risk rejecting an entire call, so bounds must be enforced locally and stripped before transmission.

## Known blockers and risks

- **Human-only:** eligibility attestations, the CALL-E account email, the demo video upload, and the final Devpost submission.
- **Free CALL-E calls are finite and are what judges will use.** Do not spend them on testing. A duplicate call has already been caused once by a client timeout; see `docs/SYSTEM_STATE_FOR_AGENTS.md`.
- Eight of fifteen designed routes remain unbuilt. This is disclosed honestly in the write-up and should stay disclosed.
- No end-to-end browser automation, visual-regression baselines, or automated accessibility scanning. Browser passes are manual.
- Initial frontend chunk is 1.23 MB.
- CALL-E publishes no webhook signing scheme, so that route is authenticated by a URL token. Replace it if one appears.
- Published evaluator credentials mean the session boundary is an access control, not an identity system. **`CALL_E_MODE` is what protects the call budget.**
- Do not install nvm-windows silently on this machine again; it removed the Node installation once.

## Tooling now installed in the repo

Twelve design Agent Skills live in `.agents/skills/` and `.claude/skills/` (taste-skill, high-end-visual-design, impeccable, and Emil Kowalski's nine animation/design skills).

**Two of the three reference skills are written for landing pages and must not be applied wholesale.** Taste-skill says so in its own first line: *"Not dashboards, not data tables, not multi-step product UI."* `docs/DESIGN_SYSTEM.md` records exactly which rules we take and which we refuse. Impeccable's **Operate** mode is the correct frame for this app.

The detector is the enforcement mechanism and needs no API key:

```bash
npx impeccable detect apps/fieldrelay-app/src --no-config
```

Run it after every UI change. It must stay at zero.
