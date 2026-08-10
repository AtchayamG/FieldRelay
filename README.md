# FieldRelay

**FieldRelay** is an AI phone-operations coordination platform for property and field-service incident management. It uses CALL-E to perform authorized real phone calls, collect structured outcomes, route decisions through human approval gates, dispatch the right technician, and maintain a complete audit trail.

## Try it — live demo

| | |
|---|---|
| **URL** | **https://fieldrelay-pi.vercel.app** |
| **Email** | `ops.demo@fieldrelay.io` |
| **Password** | `DemoOps2026!` |

Both fields are pre-filled, so **Continue as Demo Ops Manager** signs you straight in. The credentials above are here in case the pre-filled values are cleared by a password manager or autofill. Use the eye icon in the password field to check what was filled.

Suggested path: Mission Control → Incidents → open an incident → Calls & AI Ops → open a call record → Settings.

### Supervised CALL-E demonstration

**FieldRelay dials exactly one number, and it is always a number somebody deliberately provisioned.** There is no code path that accepts a phone number from a request body, a database row, or a call transcript. That is the point of the product, so it is also the point of this section.

The hosted environment may be switched between demo and live mode by the maintainer. **Do not place a real call unless the maintainer or a judge has explicitly arranged a supervised test.** The public credentials are for exploring the workflow, not permission to spend the project's metered call allowance or ring the provisioned contact.

For an arranged live judging session, the operator can point the next authorized call at the judge's own phone:

1. Sign in and open **Settings**.
2. Under **Live call target**, enter:
   - **Mobile number** in E.164 form — country code first, e.g. `+14155550123`, `+6598765432`. Spaces and dashes are fine.
   - **Region** — pick yours from the list. CALL-E supports US, SG, MY, IN, AE, AU, CA, GB, VN, DE, JP, FR, MX, BR, ID, PH and KE.
   - **Language locale** — e.g. `en-US`, `en-IN`, `en-GB`.
   - **Authorized contact** — leave as `CNS-4491`.
3. **Save call target.** Takes effect on the next call. No redeploy, no restart.
4. Open an incident and start a vendor-availability call only after confirming the session is in live mode. The validated answer appears on the call record after the provider webhook completes.

Your number replaces the previous target rather than adding to it, so only ever one phone can ring. Press **Remove** and the target falls back to whatever the environment provisioned.

> **This is deliberately a change, not an addition.** FieldRelay will not hold a list of numbers it may call. One target, replaced explicitly by a person, is the only shape that makes "it cannot dial a number nobody provisioned" a claim rather than a slogan.

### About the call counter

The sidebar shows **"N real calls placed"** — not calls remaining. That is deliberate. CALL-E's API exposes no balance endpoint, its published free allowance differs between its own sources (the Devpost page says 20, heycall-e.com says 200), and the allowance can be topped up via [CALL-E's request form](https://forms.gle/EPQttEZ1rkW8iq9q6). Any "remaining" number would be a guess presented as fact, and would read as broken the moment it hit zero while calls still worked. Calls placed is verifiable from FieldRelay's own records.

The count includes three calls made before this deployment existed — one CLI test and two proof calls — because they drew down the same CALL-E account. Simulated calls are never counted; they reach no telephone and cost nothing.

**Nothing is blocked when the count is high.** The number is information, not a gate.

FieldRelay's first real call, including the structured result CALL-E returned, is recorded in [`docs/CALL_E_RUNTIME_PROOF.md`](docs/CALL_E_RUNTIME_PROOF.md).

## Configuring the number CALL-E dials

Two different numbers are involved, and they are configured in two different places.

**The number being called (the recipient).** FieldRelay owns this. There are exactly two places it can come from, and no third.

#### 1. `CALLE_DIAL_TARGETS` — the environment default

```bash
# Format: contactId=+E164|REGION|locale   (comma-separated for several contacts)
CALLE_DIAL_TARGETS=CNS-4491=+6512345678|SG|en-SG
```

This is the provisioned default. It is read at boot, validated as E.164, and the deployment **fails to start** if `CALL_E_MODE=live` and this is malformed — a live deployment with an unusable call target is a worse failure than not starting.

Set it wherever your environment lives:

| Deployment | Where |
|---|---|
| Local | `.env` at the repository root (git-ignored) |
| Vercel | Project → Settings → Environment Variables → `CALLE_DIAL_TARGETS` |
| Docker | `docker-compose.judge.yml`, or `-e CALLE_DIAL_TARGETS=...` |

The hosted environment keeps this value private. The API exposes only a masked suffix.

#### 2. Settings → Live call target — the runtime override

Gated by `CALLE_ALLOW_RUNTIME_DIAL_TARGET`, which is **`false` by default** in `.env.example` and **`true` on the public demo**, deliberately, so a judge can point the system at their own phone without redeploying.

When on, a number entered in Settings takes precedence over `CALLE_DIAL_TARGETS` for the contact it is bound to. It is still validated as E.164, still bound to an authorized contact, and still subject to that contact's allowed purposes. Turning it off is the switch that makes the environment the only authority.

#### What is true of the number either way

- Validated as E.164 before it is stored, never after.
- Bound to a contact that is authorized **for that specific call purpose** — a contact authorized for status updates cannot be called for vendor availability.
- **Masked to its last four digits in every API response.** The full number is never returned to the browser.
- **Never written to the audit trail in full**, and never written to the database from a call outcome. If CALL-E returns a phone number in a structured answer, the webhook boundary drops it; there is a test asserting exactly that.

**The number being called *from* (the caller ID).** CALL-E owns this, not FieldRelay. Configure it in the [CALL-E dashboard](https://dashboard.heycall-e.com) by purchasing a number on the platform or connecting a SIP trunk. Per CALL-E's documentation an existing personal number generally cannot be attached, because of telecom identity verification, and outbound calling requires KYC verification in some regions.

## Repository contents

This repository is also a **Git-ready implementation handoff** for Codex, Claude Code, Google Antigravity, designers, and human reviewers. Agents should read [`docs/SYSTEM_STATE_FOR_AGENTS.md`](docs/SYSTEM_STATE_FOR_AGENTS.md) after `AGENTS.md`. It contains:

- 90 separate, high-resolution screen mockups
- Dark and light theme parity
- Desktop, tablet, and mobile responsive references for every page
- Product, UI/UX, system, data, CALL-E, security, and delivery blueprints
- Per-page implementation specifications
- Machine-readable design tokens and mockup manifest
- The deterministic mockup renderer used to produce the reference images

## Authoritative hierarchy

When implementation decisions conflict, use this order:

1. `docs/00_MASTER_BLUEPRINT.md`
2. Page mockup image for the relevant theme and breakpoint
3. `docs/03_UI_UX_DESIGN_SYSTEM.md`
4. `docs/04_RESPONSIVE_APP_SHELL.md`
5. Per-page specification under `mockup_specs/pages/`
6. Other architecture and delivery documents
7. Coding-agent implementation choices

The coding agents must not reinterpret the visual direction, replace the navigation model, or mark a page complete while reference elements are missing.

## Repository structure

```text
FieldRelay/
├── README.md
├── docs/
│   ├── 00_MASTER_BLUEPRINT.md
│   ├── 01_PRODUCT_AND_WIN_STRATEGY.md
│   ├── 02_SYSTEM_ARCHITECTURE.md
│   ├── 03_UI_UX_DESIGN_SYSTEM.md
│   ├── 04_RESPONSIVE_APP_SHELL.md
│   ├── 05_INFORMATION_ARCHITECTURE.md
│   ├── 06_CALL_E_WORKFLOW_ARCHITECTURE.md
│   ├── 07_DATA_MODEL_AND_API_CONTRACTS.md
│   ├── 08_SECURITY_CONSENT_AUDIT.md
│   ├── 09_AGENT_ORCHESTRATION_AND_DELIVERY.md
│   ├── 10_IMPLEMENTATION_ROADMAP.md
│   ├── 11_VISUAL_QA_AND_ACCEPTANCE.md
│   ├── 12_DEVPOST_SUBMISSION_PLAN.md
│   └── 13_DEMO_SCRIPT.md
├── mockups/
│   ├── dark/
│   │   ├── desktop/
│   │   ├── tablet/
│   │   └── mobile/
│   └── light/
│       ├── desktop/
│       ├── tablet/
│       └── mobile/
├── mockup_specs/
│   ├── mockup-manifest.json
│   ├── design-tokens.json
│   └── pages/
├── assets/
└── scripts/
    └── generate_mockups.py
```

## Visual direction

**Approved direction:** Neon Ops Enterprise

The product combines:

- enterprise SaaS clarity
- restrained neon cyan and violet accents
- operations-command-centre information density
- strong dark/light theme equivalence
- desktop-first incident coordination
- tablet supervisory workflows
- mobile incident, call, dispatch, and approval workflows

The design deliberately avoids excessive glassmorphism, uncontrolled glow, cartoon imagery, fake 3D decoration, and consumer-social patterns.

## Screen inventory

1. Secure Sign In
2. Mission Control
3. Incidents
4. Incident Detail
5. Create Incident
6. Calls & AI Operations
7. Dispatch Board
8. Technicians
9. Vendor Detail
10. Approvals
11. Customers & Properties
12. Analytics
13. Audit & Consent
14. Knowledge Base
15. Settings

Every screen exists in:

- Dark / Desktop
- Dark / Tablet
- Dark / Mobile
- Light / Desktop
- Light / Tablet
- Light / Mobile

## Recommended implementation stack

```text
Ionic Angular + Capacitor
        │
        ├── Responsive web application
        ├── Installable PWA
        ├── Android package
        └── Later iOS package

NestJS API + workflow service
        │
        ├── CALL-E SDK/API/MCP integration
        ├── Incident orchestration engine
        ├── Human approval engine
        ├── Event stream / WebSocket updates
        ├── PostgreSQL
        ├── Object storage
        └── Auditing, consent and observability
```

## Start here

1. Read `docs/00_MASTER_BLUEPRINT.md`.
2. Review `docs/03_UI_UX_DESIGN_SYSTEM.md` and `docs/04_RESPONSIVE_APP_SHELL.md`.
3. Open the relevant mockup image before implementing each route.
4. Use the corresponding page specification under `mockup_specs/pages/`.
5. Validate the implementation using `docs/11_VISUAL_QA_AND_ACCEPTANCE.md`.

## No Placeholder Completion Rule

A route, module, theme, breakpoint, or milestone must not be marked **Done**, **Complete**, **Approved**, or **Production Ready** while any of the following remain:

- placeholder values or lorem ipsum
- missing reference components
- nonfunctional primary actions
- unimplemented error/loading/empty states
- mock-only CALL-E invocation where a working call is claimed
- missing dark/light parity
- mobile/tablet overflow
- inaccessible controls or missing keyboard focus
- missing security, consent, approval, or audit behavior
- undocumented deviation from the blueprint

## License and submission note

Choose the final repository license only after checking the CALL-E hackathon submission and pull-request requirements. Do not publish private phone numbers, production credentials, access tokens, CALL-E secrets, transcripts containing personal information, or judge credentials in version control.
