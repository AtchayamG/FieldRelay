# Delivery Plan

## Strategy

Ship one judge-visible, safe, end-to-end incident workflow first, then expand route coverage and visual parity. Every milestone must leave the build runnable.

| Milestone | Outcome | Owner/model route | Gate |
|---|---|---|---|
| M0 Rules and foundation | Monorepo, CI, tokens, shell, contracts, evidence matrix | Codex; Antigravity Gemini 3.6 Flash High for UI; Claude strongest available for architecture review | install, lint, typecheck, tests, production builds |
| M1 Incident slice | sign-in/demo access, create/list/detail, seeded data, audit events | Antigravity UI; Claude backend/contracts; Codex integration | browser flow works at desktop/mobile in both themes |
| M2 CALL-E slice | secure adapter, allowlist/consent, idempotent call start, result mapping, visible status | Claude strongest available; Codex security/integration | real authorized smoke test or explicit BLOCKED; demo adapter tests |
| M3 Decision loop | quote normalization/comparison, approval, dispatch, commitments | Claude workflow; Antigravity UI | end-to-end happy path plus no-answer/reject/stale-decision paths |
| M4 Supporting product | remaining P0/P1 routes with connected data | Antigravity bounded features; Hermes tests/docs | required states and responsive route checks |
| M5 Hardening | accessibility, security, performance, Capacitor/PWA, hygiene | independent Claude review; Antigravity test matrix; Codex | full CI, build, secret scan, visual report |
| M6 Submission | deployable judge environment, upstream contribution package, video/copy/checklists | Codex; Hermes documentation; human for attestations/publication | evidence maps to every official requirement |

## Git and worker isolation

- Integration branch: `codex/devpost-foundation`, followed by focused `codex/*` branches.
- Each writable external worker receives a clean disposable worktree and non-main branch.
- Workers never commit, push, publish, call real numbers, or edit outside their file contract.
- Codex reviews diffs, reproduces tests, integrates one result at a time, and removes completed worktrees.

## Test strategy

- Domain/application: focused unit tests for state transitions, money, consent, idempotency, retries, and stale decisions.
- API: controller/adapter contract tests, webhook replay/signature tests, and persistence integration tests.
- App: component tests for states and Playwright tests for the critical workflow.
- Visual: reference viewports 1920x1080, 1024x1366, and 430x932 in both themes, plus overflow widths from `11_VISUAL_QA_AND_ACCEPTANCE.md`.
- Release: lint, strict typecheck, unit/integration/E2E, production builds, PWA audit, secret/dependency scan.

## Human/external blockers

- User must truthfully confirm age, jurisdiction, submitter type, and conflict-of-interest attestations.
- CALL-E account credentials and an explicitly authorized test number are required for a real-call proof.
- Production deployment, public video upload, upstream pull request, Devpost legal checkboxes, and final submission require explicit user approval.
