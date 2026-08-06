# Design System — Machined Graphite

The committed visual direction for FieldRelay. Any agent touching the UI reads this first.

## The mode this app is in

Impeccable classifies surfaces by what success looks like. FieldRelay is **Operate**, not Persuade:

> *"the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, native expectations, and the real usage scene outrank expression. **Brand lives in precise details.**"*

This matters because **two of our three reference skills are written for landing pages and must not be applied wholesale.** Taste-skill says so in its own first line:

> *"Landing pages, portfolios, and redesigns. **Not dashboards, not data tables, not multi-step product UI.**"*

### What we take, and what we refuse

| Take | Refuse |
|---|---|
| Banned fonts, icons, borders, shadows | `py-24` to `py-40` macro-whitespace |
| Double-bezel nested enclosures, concentric radii | Massive hero typography |
| Custom cubic-bezier motion, no `linear`/`ease-in-out` | Floating detached pill navbar |
| Shape-consistency lock: one radius scale | Asymmetric bento / Z-axis rotation |
| Shadows tinted to the canvas hue, never black | "Eyebrow tag above every heading" |
| Cards only where elevation means hierarchy | Scroll-reveal on operational data |

Applying landing-page rules to a dense ops console is exactly the mistake these skills warn about. An operator scanning a call queue does not want the layout to breathe heavily.

## Direction

**Machined Graphite.** The console should read as instrumentation — field equipment with a screen — not as a SaaS dashboard. Property maintenance is physical work; the UI should feel machined.

| | |
|---|---|
| Canvas | `#0B0C0E` near-black, faintly warm |
| Surface | Nested trays: outer shell + inner core |
| Radii | 16px outer / 11px inner (concentric, `outer - padding`) |
| Rule | Hairline `rgba(255,255,255,0.07)` — never 1px solid gray |
| Signal | `--fr-color-signal` — `#E8A33D` dark, `#B5761F` light |
| Type | Geist |
| Mono | Geist Mono — every ID, phone number, amount, timestamp |
| Shadow | Tinted to canvas hue. Never `rgba(0,0,0,·)` |
| Motion | `cubic-bezier(0.32, 0.72, 0, 1)` |

**The signal colour is rationed.** It marks live state and nothing else. If amber appears on a screen more than twice, something is wrong.

## The logo

**Signal and Gate.** An incident (filled dot) sends a call outward as two arcs; the call stops against a solid bar. The mark is the product thesis: it goes out, it comes back, nothing passes without a person.

`shared/components/logo/logo.component.ts`. Strokes and gate are `currentColor` so the mark re-themes with the shell; the signal amber is the only baked colour. Strokes thicken as the mark shrinks; the far wave drops below 18px where it reads as noise rather than a second wave.

**What it replaced, and why it mattered:** a lightning bolt inside a rounded-square tile on a purple-to-cyan gradient — three of the most-named tells of generated UI stacked in one 38px box, saying *energy* about a product that is really about *restraint*.

## Typography

Inter and JetBrains Mono are **retired**. Inter is the single most recognisable typographic tell of generated interfaces. The fallback chain degrades to the platform grotesque, never to Arial.

```css
--fr-font-primary: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
--fr-font-technical: 'Geist Mono', ui-monospace, 'SFMono-Regular', 'Cascadia Mono', monospace;
```

Anything a person might read aloud on a phone call — an ID, an amount, a number — is set in mono. That is a semantic rule, not a decorative one.

## Standing anti-patterns

Enforced by `npx impeccable detect apps/fieldrelay-app/src`.

- **No side-tab borders.** A thick coloured border on one edge of a card is the most recognisable AI tell. Carry state in a dot, a label, or the text itself.
- **No purple-to-blue gradients.** Retired with the old mark.
- **No pure black or untinted gray.** Every neutral carries a hint of the canvas hue.
- **No cards inside cards** unless the nesting is the double-bezel construction, which is deliberate.
- **No bounce or elastic easing.** Dated, and wrong for instrumentation.
- **No animating `width`, `height`, `padding`, or `margin`.** Transform and opacity only.
- **No rounded-square icon tile above a heading.**
- **One radius scale**, followed everywhere.

## Detector baseline — 2026-08-07

First clean run after the brand change found **12 anti-patterns**, and the shape of them is diagnostic: 11 of 12 are the same tell.

| Rule | Count | Where |
|---|---:|---|
| `side-tab` | 11 | metric-card ×4, mission-control ×3, sidebar, approvals, sign-in, call-detail |
| `layout-transition` | 1 | sidebar animates `width` |

Both are fixed in the token-and-shell pass, not piecemeal. Re-run the detector after every UI change; it needs no API key and no LLM.

## Order of work

1. Logo, tokens, fonts, favicon — **done**
2. Shell: topbar, sidebar, metric cards. Clears all 12 detector findings
3. Rebuild the 7 existing screens onto the tray construction
4. Dispatch Board, Technicians, Vendors, Analytics
5. Polish: empty states, error states, a11y audit, reduced-motion
6. Only then record the demo

Nothing gets filmed until the redesign is complete, or the video is shot twice.
