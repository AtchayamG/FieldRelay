# Design System — Cobalt Ops

> **Correction, 2026-08-07.** An earlier pass ("Machined Graphite") drained this
> palette to near-greyscale in the name of rationing the accent. That was wrong
> twice over: it made the product look austere rather than premium, and in an
> operations console **status colour is functional** — an operator has to tell
> `CRITICAL` from `DISPATCHED` by hue at a glance, without reading the label.
> Removing that was a usability regression dressed up as restraint.
>
> Colour is back and it has a job. The craft rules below survive unchanged; only
> the palette section was rewritten. Read `## Palette` for what is current — the
> Machined Graphite notes are kept only where they explain a rule that still
> holds.

## Palette

**Cobalt Ops.** Cobalt carries actions, links and focus. The status ramp runs at
full strength in both themes.

Cobalt specifically, because a screen full of red, amber and green has a
**blue-shaped hole in it** — the accent never collides with a state colour.

| Role | Light | Dark |
|---|---|---|
| Canvas | `#F7F8FA` | `#0C0E13` |
| Surface | `#FFFFFF` | `#141821` |
| Text | `#12151C` | `#EDEFF2` |
| **Action / signal** | `#2563EB` | `#3B7DFF` |
| Critical | `#D22F3A` | `#F2555A` |
| Warning | `#B45309` | `#F5A524` |
| Success | `#12855F` | `#2DC78C` |

Status colours run **brighter in dark theme than in light**. A pill nobody can
read at a glance is decoration, not information.

`--fr-color-signal` and `--fr-color-primary` are the same family on purpose:
"the system is working" and "you can act here" should feel related, not like two
brands.

**What is not coming back:** the purple-to-blue gradient. One flat accent, no
gradient, no glow. The only accent-tinted shadow is a faint lift under the
primary button.

---

# Design System — original notes

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

### Accent discipline, corrected

The original rule was "the signal colour is rationed — it marks live state and nothing else." Taken literally it produced a greyscale product, so it now reads:

**The accent is used deliberately, not sparingly.** It carries actions, links, focus and live state — the things a user acts on or waits for. It does not appear as decoration, and it never appears as a gradient.

**Status colour is not rationed at all.** It is the fastest channel an operator has, and every status pill should be legible by hue alone.

### Both themes are one product

The light palette was once missed entirely — only the dark block was converted in the first pass — leaving `#6D28D9` purple and mismatched neutrals behind. Whatever changes in one theme changes in both, in the same commit.

Shadows in both are tinted to the canvas hue, never pure black. The single exception is a faint accent-tinted lift under the primary button, so the one control users look for sits slightly proud of the page.

### Never give `var()` a fallback for a token you own

The header wordmark was invisible in light theme because it referenced `--fr-color-text-primary`, which does not exist in this system, with a hardcoded near-white fallback. The fallback did exactly its job and painted white text on a white header; the typo never surfaced.

A `var()` fallback hides a mistake instead of revealing it. Reference the token bare, and run the checker:

```bash
node scripts/check-tokens.mjs
```

It reports every referenced-but-undefined custom property and flags the ones masked by a fallback. Currently 66 defined, 57 referenced, all resolving.

## The logo

**Signal and Gate.** An incident (filled dot) sends a call outward as two arcs; the call stops against a solid bar. The mark is the product thesis: it goes out, it comes back, nothing passes without a person.

`shared/components/logo/logo.component.ts`. Strokes and gate are `currentColor` so the mark re-themes with the shell; the signal amber is the only baked colour. Strokes thicken as the mark shrinks; the far wave drops below 18px where it reads as noise rather than a second wave.

**What it replaced, and why it mattered:** a lightning bolt inside a rounded-square tile on a purple-to-cyan gradient — three of the most-named tells of generated UI stacked in one 38px box, saying *energy* about a product that is really about *restraint*.

## Typography

Inter and JetBrains Mono are **retired**. Geist Variable and Geist Mono Variable are self-hosted through `@fontsource-variable`, so typography does not depend on Google Fonts or conflict with the production CSP. The fallback chain degrades to the platform grotesque, never to Arial.

```css
--fr-font-primary: 'Geist Variable', 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
--fr-font-technical: 'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SFMono-Regular', 'Cascadia Mono', monospace;
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

## Workspace geometry

Desktop detail pages begin one shell gutter after the sidebar. They must not add a centered,
narrow wrapper that creates a second false gutter inside the application canvas. Calls queue
and call detail share a 1400px content cap; detail content is left-anchored (`margin: 0`) so its
navigation, banner and evidence panels align with the rest of the operations workspace.

## Detector baseline — 2026-08-16

First clean run after the brand change found **12 anti-patterns**, and the shape of them is diagnostic: 11 of 12 are the same tell.

| Rule | Count | Where |
|---|---:|---|
| `side-tab` | 11 | metric-card ×4, mission-control ×3, sidebar, approvals, sign-in, call-detail |
| `layout-transition` | 1 | sidebar animates `width` |

Both remain fixed. The 2026-08-16 call-detail alignment correction again reports **zero findings**. Re-run the detector after every UI change; it needs no API key and no LLM.

The 2026-09-02 call-detail provider-status action uses the existing secondary-button language and
changes no visual contract. Its post-change detector run reports **zero findings**; token resolution
remains 66 defined / 57 referenced / all resolving.

The 2026-09-03 incident call-launch control follows the same dense tray language: three compact
readiness facts, a separate confirmation tray, warning colour only for the real metered side effect,
and cobalt only for the operator action. The pre-Angular loading surface uses the same Cobalt Ops
canvas and surface values because design tokens are not available until the bundle loads. Detector
and token checks remain at zero findings and full resolution.

## Order of work

1. Logo, tokens, fonts, favicon — **done**
2. Shell: topbar, sidebar, metric cards. Clears all 12 detector findings
3. Rebuild the 7 existing screens onto the tray construction
4. Dispatch Board, Technicians, Vendors, Analytics
5. Polish: empty states, error states, a11y audit, reduced-motion
6. Only then record the demo

Nothing gets filmed until the redesign is complete, or the video is shot twice.
