# Agent Orchestration and Delivery Plan

## 1. Roles

### Codex — Lead orchestrator and integration owner

Responsibilities:

- repository structure
- architecture enforcement
- task decomposition
- backend and CALL-E integration
- shared contracts
- CI/CD
- cross-module integration
- final testing and release readiness

### Claude Code — Product architecture and review authority

Responsibilities:

- requirements clarification
- workflow and edge-case review
- security and policy review
- complex debugging
- documentation quality
- Devpost narrative and demo script

### Claude Design — UI/UX authority

Responsibilities:

- visual reference interpretation
- component and responsive review
- content design
- theme parity
- accessibility review
- visual-gap reports

### Google Antigravity — Parallel implementation and validation

Responsibilities:

- isolated feature modules
- reusable components
- unit/E2E test generation
- responsive validation
- performance checks
- documentation updates

## 2. Branch model

```text
main
├── develop
├── feature/shell-and-design-system
├── feature/incidents
├── feature/call-e-workflows
├── feature/dispatch
├── feature/approvals
├── feature/audit-consent
└── release/devpost-submission
```

Use short-lived branches. Do not let multiple agents edit the same core file without coordination.

## 3. Ownership boundaries

- Design tokens and shell: one owner
- API contracts: one owner
- database schema/migrations: one owner
- CALL-E adapter: one owner
- each feature route: one implementation owner
- shared components: reviewed before reuse

## 4. Required coordination files

```text
docs/taskstatus.md
docs/handover.md
docs/Implementation_Changelog.md
docs/Debugging_Log.md
docs/IMPLEMENTATION_DECISIONS.md
```

Each agent must update status before handoff.

## 5. Task template

```markdown
## Task

### Objective

### Authoritative references
- Blueprint section
- Mockup path
- Page specification

### In scope

### Out of scope

### Acceptance criteria

### Required tests

### Files owned

### Handoff notes
```

## 6. Completion gates

An agent may not mark work complete until:

- lint passes
- type checking passes
- unit tests pass
- relevant E2E path passes
- dark/light screenshots reviewed
- responsive widths reviewed
- no placeholder data remains unless explicitly seeded demo data
- error/loading/empty states exist
- documentation updated

## 7. Conflict prevention

- Codex assigns file ownership
- agents avoid drive-by refactors
- API changes require contract update first
- migrations are sequential
- shared style changes require visual regression review
- design deviations require an implementation decision record

## 8. Token-efficient strategy

- give each agent the smallest relevant document set
- refer to image paths rather than pasting all images into every prompt
- maintain concise handover summaries
- avoid having multiple agents independently rediscover architecture
- use automated checks before expensive review passes

## 9. Final review

Codex integrates. Claude performs architecture/security review. Claude Design compares implementation to references. Antigravity runs the visual and E2E matrix. The human product owner performs final approval.
