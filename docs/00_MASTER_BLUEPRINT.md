# FieldRelay Master Blueprint

**Document status:** Authoritative  
**Product:** FieldRelay  
**Visual system:** Neon Ops Enterprise  
**Primary delivery:** Ionic Angular responsive PWA + Capacitor Android  
**Backend:** NestJS + PostgreSQL + CALL-E  

## 1. Product definition

FieldRelay is an operations platform that resolves field-service incidents through coordinated, authorized AI phone workflows. It is not a generic voice bot, chatbot, ticketing clone, or call-centre dialer.

A FieldRelay workflow starts with a real operational issue and continues until a verified outcome is achieved:

```text
Incident intake
  → AI-assisted triage
  → authorized phone workflow
  → structured CALL-E outcome
  → vendor comparison
  → human approval where required
  → dispatch
  → arrival and progress verification
  → customer confirmation
  → closure with audit evidence
```

## 2. Target users

### Operations Lead
Owns the incident queue, SLA performance, approval policy, escalations, and overall operational health.

### Dispatcher
Coordinates vendors and technicians, monitors live calls, compares responses, and assigns work.

### Property Manager
Creates incidents, confirms local context, approves spend, and follows resolution progress.

### Field Supervisor
Uses tablet or mobile to monitor routes, technician workload, incidents, and escalations.

### Technician or Vendor Dispatcher
Receives authorized calls, confirms availability, ETA, estimated cost, skill fit, and completion state.

### Auditor or Compliance Reviewer
Reviews consent, transcript handling, decisions, approvals, data access, and immutable event history.

## 3. Winning product thesis

The winning value is not “AI makes phone calls.” The value is:

> FieldRelay converts fragmented human phone coordination into a safe, accountable, closed-loop operational workflow.

The product must score across the CALL-E judging dimensions:

- **Real-world impact:** a clear phone-work problem with practical users
- **Quality of idea:** closed-loop multi-party coordination, not a basic outbound call
- **Technical implementation:** CALL-E invoked at runtime with structured results
- **Product experience:** polished, coherent and testable end-to-end application

## 4. Non-negotiable product behaviors

1. CALL-E is called through the backend at runtime.
2. Only authorized phone numbers may be contacted.
3. Every call has a declared purpose and disclosure policy.
4. Structured results are validated before they affect workflow state.
5. Human approval is required for configured spend, assignment, escalation, and sensitive actions.
6. A failed, unanswered, ambiguous, or interrupted call produces an explicit state.
7. Retries are bounded and policy-controlled.
8. The system records every material action in the audit log.
9. Incident closure requires verification, not merely a completed call.
10. Judges can access a functioning deployed application with safe seeded data.

## 5. Platform decision

FieldRelay will be implemented in Ionic Angular rather than as a browser-only PWA or Flutter-first product.

### Why

- desktop operations command centre is the highest-priority surface
- public web URL gives frictionless judge access
- Ionic Angular supports the same responsive application as PWA and Capacitor Android
- Angular, RxJS, Ionic and Capacitor align with the product owner’s strongest expertise
- enterprise tables, forms, keyboard navigation and browser semantics remain natural
- the Android build demonstrates a complete hybrid product without duplicating the implementation

### Product surfaces

| Surface | Primary user | Priority |
|---|---|---:|
| Desktop responsive web/PWA | Operations lead, dispatcher | P0 |
| Tablet responsive web/PWA | Supervisor, property manager | P0 |
| Android Capacitor app | Mobile supervisor, coordinator | P1 |
| iOS Capacitor app | Later production release | P2 |
| Dedicated technician companion | Future expansion | P3 |

## 6. Visual authority

The mockups in `mockups/` are implementation references, not inspiration boards.

Rules:

- dark and light themes use the same information architecture
- components keep the same hierarchy and dimensions unless breakpoint behavior requires change
- no inline arbitrary colors in feature components
- no page-specific navigation reinvention
- no excessive glow, gradients, glass panels, or decorative animation
- operational state must be understandable without relying on color alone
- all screens must remain usable at 200% zoom and with keyboard navigation

## 7. Route inventory

```text
/auth/sign-in
/mission-control
/incidents
/incidents/new
/incidents/:incidentId
/calls
/dispatch
/technicians
/technicians/:technicianId
/vendors
/vendors/:vendorId
/approvals
/customers
/customers/:customerId
/properties/:propertyId
/analytics
/audit
/knowledge
/settings
```

## 8. Major domains

- Identity and access
- Organization and teams
- Customer and property management
- Incident intake and triage
- CALL-E phone operations
- Vendor and technician management
- Dispatch and scheduling
- Human approvals
- Notifications and communication
- Knowledge and policies
- Audit, consent and data governance
- Analytics and reporting

## 9. Runtime architecture principles

- API-first module boundaries
- workflow state is persisted, not held only in memory
- calls are asynchronous jobs with idempotency keys
- external callbacks are verified and replay-safe
- domain events are append-only
- UI receives live updates through SSE or WebSocket
- secrets stay server-side
- all third-party calls have timeouts, retry limits and circuit breakers
- demo mode uses safe seeded contacts and an explicit simulation flag where real calling is inappropriate

## 10. Definition of production-ready for the hackathon

The application is considered submission-ready only when:

- all P0 routes work end to end
- both themes pass the visual parity checklist
- desktop, tablet and mobile layouts pass overflow checks
- one real authorized CALL-E workflow is demonstrated successfully
- no-answer, retry, approval and escalation flows work
- a judge can sign in, run a safe scenario, inspect the outcome, and read setup instructions
- the repository contains deployment and local-run documentation
- secrets and personal information are absent from source control
- the three-minute demo video uses real application footage
- the CALL-E contribution pull request is ready or submitted

## 11. Authority and change control

A coding agent may make implementation-level decisions when the blueprint is silent. It may not silently change product scope, remove reference components, weaken consent or approval controls, or alter the approved visual system.

Any deviation must be recorded in:

```text
docs/IMPLEMENTATION_DECISIONS.md
```

Each decision must include:

- issue
- affected screen or module
- blueprint requirement
- chosen deviation
- reason
- risks
- approval owner
