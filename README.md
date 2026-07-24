# FieldRelay — Product Blueprint & UI/UX Reference Repository

**FieldRelay** is an AI phone-operations coordination platform for property and field-service incident management. It uses CALL-E to perform authorized real phone calls, collect structured outcomes, route decisions through human approval gates, dispatch the right technician, and maintain a complete audit trail.

This repository is a **Git-ready implementation handoff** for Codex, Claude Code, Google Antigravity, designers, and human reviewers. It contains:

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
