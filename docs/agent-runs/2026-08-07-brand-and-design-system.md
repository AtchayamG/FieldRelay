# Run record — brand and design system

**Date** 2026-08-07 · **Agent** Claude · **Branch** `main` · **Commits** `c26092b`, `314d613`, `94e0997`, `9ddca96`

## Task

Replace the generic application mark, commit a premium visual direction that does not read as generated SaaS UI, and prepare the codebase for four new routes.

## What was decided, and by whom

The user selected both, from options presented with previews:

- **Direction: Machined Graphite** — near-black warm canvas, nested trays, hairlines, one rationed signal accent. Rejected alternatives were Editorial Light and Refined Dark Ops.
- **Sequence: design system first** — tokens and existing screens before new routes, and **film last**, so the demo is shot once against the finished app.

## The scope finding that shaped everything

The user supplied three reference repositories. Reading them rather than assuming produced the most important decision of the run:

**Taste-skill excludes this kind of application in its own first line:**

> *"Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI."*

**Impeccable, by contrast, has an `Operate` mode written for it:**

> *"the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, native expectations, and the real usage scene outrank expression. Brand lives in precise details."*

So the craft rules were taken from all three (banned fonts and icons, tinted shadows, concentric radii, custom easing, shape-consistency lock) and the landing-page rules were refused (`py-24`–`py-40` macro-whitespace, hero typography, floating pill navbar, asymmetric bento). Applying the latter to a dense operations console is precisely the failure those skills warn about.

Recorded permanently in `docs/DESIGN_SYSTEM.md` so the next agent does not re-litigate it.

## Changes

### Brand

| | |
|---|---|
| Logo | New `shared/components/logo/logo.component.ts` — "Signal and Gate" |
| Replaced | Lightning bolt in a rounded-square tile on a purple-to-cyan gradient |
| Favicon | Same mark, inline SVG data URI |
| Type | Inter + JetBrains Mono → **Geist + Geist Mono** |

The old mark stacked three separately-named tells of generated UI in one 38px box, and said *energy* about a product whose entire argument is *restraint*. The new mark is the thesis: an incident sends a call outward as two arcs, and the call stops against a solid gate.

Strokes and gate are `currentColor` so the mark re-themes with the shell; the signal amber is the only baked colour. Stroke weight scales inversely with size so it survives a favicon, and the far wave drops below 18px where it reads as noise rather than a second wave.

### Tokens

Added `--fr-color-signal`, the tray set (`--fr-tray-pad`, `--fr-tray-radius`, `--fr-tray-radius-inner`), `--fr-hairline`, `--fr-hairline-strong`, `--fr-tray-shell`, `--fr-tray-inner-lip`, `--fr-ease`, `--fr-shadow-tray`, `--fr-shadow-raised`. Dark palette moved from blue-black to warm graphite; every accent desaturated one step so nothing glows.

### Detector: 12 → 0

`npx impeccable detect apps/fieldrelay-app/src --no-config`

| Rule | Before | After |
|---|---:|---:|
| `side-tab` | 11 | 0 |
| `layout-transition` | 1 | 0 |

Eleven of twelve findings were the **same** tell — a thick coloured border down one card edge. It was also poor information design: a colour bar with no label makes the reader guess, and it fails outright for anyone who cannot separate the hues. State now travels as a labelled dot or as the text itself.

Each removal had a specific reason beyond the rule:

- **Approvals list** — a warning bar on *every* card carried no information; it only announced the framework.
- **Call outcome panel** — a green edge read as *this answer is good* on a panel built to display answers that may have failed validation.
- **Guardrail panel** — a green edge contradicted the amber rows inside it, since guardrails can be relaxed.
- **Sidebar** — a full-height slab fought the row's own radius; replaced with a short inset signal rule.

The twelfth finding, the sidebar animating `width`, never ran on a user action at all — the rail/full switch is a media query — so it only ever cost a reflow on resize.

## Two honesty defects, both found on the deployment

Neither was caught by tests. Both were caught by signing in against production and reading what the API actually returned.

1. **Orchestration Flow** rendered a heading and a hardcoded badge reading `INC-2026-9041 Pipeline` — an incident that does not exist in the deployment — above an empty body, because the API adapter returned `orchestration: []`. Now derived from the most recent real call task across seven steps, stating plainly where the system stopped itself. A queued task also read *"Waiting to dial"* above a description claiming the call had been placed, and lit two steps as active at once; both fixed.

2. **Performance panel** reported `SLA Compliance (0%)`, `Automated Resolution (0%)` and `Vendor Dispatch Success (0%)` above three empty bars. Nothing had ever measured them — the figure was a struct default. **A zero is not the absence of a number, it is a claim**, and that one told every judge the system meets its SLA zero percent of the time, on the first screen they open. It now states which measurement each rate is waiting on.

Both are now rules in `AGENTS.md`, and "trusting fixtures instead of the deployment" is a recorded trap.

## Commands and real output

```
npx eslint .                                    clean
pnpm -r typecheck                               clean
pnpm -r test                                    385 passed (253 API, 130 app, 2 tokens), 15 skipped
pnpm -r build                                   success
npx impeccable detect apps/fieldrelay-app/src   0 findings
npx vercel --prod --yes                         Aliased https://fieldrelay-pi.vercel.app, Ready in 55s
curl https://fieldrelay-pi.vercel.app           200
```

The 15 skipped API tests are PostgreSQL-dependent and skip without a local `DATABASE_URL`. That silence has hidden a real defect before.

## Known limitations

- Only the shell and Mission Control are fully on the tray construction. Incidents, Calls, Settings and Sign-in are token-correct but not yet rebuilt onto it.
- No automated visual-regression or accessibility scanning. The detector covers anti-patterns, not contrast or keyboard paths.
- Reduced-motion handling is not yet audited across the new easing.
- The primary action button is still filled with the signal colour, which competes with the rationing rule. Flagged, not yet changed.

## Next task, exactly

Rebuild Incidents, Calls, Settings and Sign-in onto the tray construction, then build **Dispatch Board** (backend endpoint plus UI), then Vendors, Technicians, Analytics.

**The demo video remains the largest single scoring gap** — a full quarter of the official judging criteria, still unrecorded.
