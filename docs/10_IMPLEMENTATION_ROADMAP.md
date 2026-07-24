# Implementation Roadmap

## Delivery philosophy

Build a thin, working vertical slice first, then expand the product around it. Do not complete all screens with mock data before proving CALL-E and workflow persistence.

## Phase 0 — Repository and feasibility

- initialize monorepo
- configure Ionic Angular and Capacitor
- configure NestJS
- establish PostgreSQL connection
- create environment model and secret handling
- confirm CALL-E authorized test call
- document call cost/credit controls
- add CI baseline

**Exit:** one backend endpoint initiates a safe CALL-E call and persists task state.

## Phase 1 — Design system and shell

- implement tokens
- dark/light theme service
- desktop sidebar
- tablet rail
- mobile top and bottom navigation
- typography, panels, badges, buttons, fields
- responsive route container
- visual regression harness

**Exit:** shell matches mockups in six reference combinations.

## Phase 2 — Incident vertical slice

- create incident
- incident list
- incident detail
- data model and API
- validation
- seeded demo scenario
- initial audit events

**Exit:** user creates and views an incident end to end.

## Phase 3 — CALL-E workflow

- adapter
- workflow persistence
- call initiation
- live states
- structured outcome schema
- transcript reference
- no-answer and failure paths
- realtime UI updates

**Exit:** one real authorized call visibly changes incident workflow state.

## Phase 4 — Approval and dispatch

- approval policy
- approval inbox
- approve/reject/change request
- vendor comparison
- dispatch creation
- technician assignment
- commitment timeline

**Exit:** structured outcome can be approved and dispatched.

## Phase 5 — Resolution loop

- tenant access call
- technician arrival check
- missed commitment escalation
- completion confirmation
- verified resolution
- incident closure

**Exit:** complete closed-loop scenario works.

## Phase 6 — Supporting modules

- technicians
- vendor detail
- customers/properties
- analytics
- audit/consent
- knowledge base
- settings

Prioritize real connected data over broad shallow screens.

## Phase 7 — Mobile and Capacitor

- mobile route polish
- safe-area handling
- Android build
- secure storage where needed
- deep-link strategy
- push-ready notification abstraction

**Exit:** installable Android build and public PWA both operate against staging/judge API.

## Phase 8 — Hardening

- accessibility
- performance
- failure injection
- security review
- secret scan
- rate limiting
- audit completeness
- backup/restore check
- cross-browser testing

## Phase 9 — Submission

- stable judge environment
- test credentials
- README and setup
- public demo video
- screenshots
- Devpost description
- CALL-E repository contribution
- feedback submission

## Suggested milestone schedule

| Milestone | Target |
|---|---|
| Feasibility + shell | Week 1 |
| Incident + real call | Week 2 |
| Approval + dispatch | Week 3 |
| Resolution loop | Week 4 |
| Supporting modules | Week 5 |
| Mobile, hardening, demo | Week 6 |
| Submission buffer | Final week |
