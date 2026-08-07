# Handover

Last updated **2026-08-07**. If you are picking this up cold, read this file, then `docs/SYSTEM_STATE_FOR_AGENTS.md` (what exists), then `docs/DESIGN_SYSTEM.md` (how the UI must look and why). Those three are the contract.

## Current state

`main` is green and deployed. A session-protected incident and call system that has placed a **real CALL-E call end to end**, now carrying a committed visual identity.

| | |
|---|---|
| Live | https://fieldrelay-pi.vercel.app — sign-in pre-filled, one click |
| Repo | https://github.com/AtchayamG/FieldRelay |
| Upstream PR | **[#107 — open and mergeable](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107)** |
| Verification | lint clean, strict typecheck clean, **385 tests** (253 API + 130 app + 2 tokens), production build passes |
| Design detector | `npx impeccable detect apps/fieldrelay-app/src` reports **zero** |
| Deadline | 2026-09-14 23:45 SGT |

15 PostgreSQL-dependent API tests skip without a local database. Run one to exercise them; they have caught a real defect before.

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

### Built (7 of 15 designed routes)

Sign-in · Mission Control · Incidents list/detail/create · Calls queue/detail · Approvals · Settings

### Not built — the 4 the user has asked for next, in priority order

1. **Dispatch Board** — highest value. Closes the loop the demo narrates: an approved outcome becomes an assigned job. Needs a backend endpoint.
2. **Vendors** — the authorised contact list. Load-bearing for the refusal story, because "will not dial a number no operator provisioned" is currently only visible in config.
3. **Technicians** — internal roster.
4. **Analytics** — must report only measured figures. See the performance-panel defect above; do not repeat it.

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
