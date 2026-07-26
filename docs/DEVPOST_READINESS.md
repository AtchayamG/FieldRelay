# Devpost Readiness

**Verified:** 2026-07-25 against the official hackathon overview, rules and resource pages.

| Requirement | Evidence | Status | Owner | Verification |
|---|---|---|---|---|
| Submission window open | Devpost CALL-E key dates | PASS | Codex | Overview page reports the hackathon accepting submissions |
| Deadline | 2026-09-14 23:45 SGT | RESOLVED | Codex | The official overview header states "Deadline: Sep 14, 2026 @ 11:45pm SGT". The earlier AM/PM conflict is closed; roughly seven weeks remain from 2026-07-25. |
| Age/jurisdiction/conflict eligibility | Official rules and required checkboxes | BLOCKED | User | Human truthfully confirms required attestations |
| Functional CALL-E use | Real call `call_MzD1ou1AbX1XtYkTnxMCBA` placed by FieldRelay on 2026-07-25 | PASS | Codex | `docs/CALL_E_RUNTIME_PROOF.md`: FieldRelay's own use cases drove `POST /v1/calls`; the call completed with a schema-conforming structured result and round-tripped FieldRelay's task IDs in `metadata` |
| CALL-E API key | `CALLE_API_KEY` in git-ignored `.env` | PASS | Codex | Created self-service in the CALL-E dashboard; verified by a read-only probe returning 404 with the key and 401 without it |
| Authorized test number | `CALLE_DIAL_TARGETS` | PASS | User | +91 90947 13923, already used for the user's own CALL-E test call |
| Significant in-period work | Git history and changelog after 2026-07-23 | ON TRACK | Codex | Commit history on `main` from 2026-07-24 onward |
| Upstream contribution PR | `CALLE-AI/awesome-phone-call-agents` | TODO | Codex/user | FieldRelay fits the `apps/` contribution area; Codex prepares, user approves the public PR |
| Public demo video under 3 minutes | YouTube/Vimeo URL | BLOCKED | User | Local export checked, then public playback |
| Testing access | https://fieldrelay-pi.vercel.app | PASS | Codex | Deployed 2026-07-26 and verified live: health 200, anonymous read 401, demo login issues an operator session, three seeded incidents load, a call returns `simulated: true`, a dial-target change returns 403, SPA deep links resolve, CSP present |
| CALL-E account email | Devpost required field | BLOCKED | User | User supplies at submission time |
| Project/testing/use-case answers | Required Devpost fields | TODO | Codex | Draft factual answers from verified product |
| Final legal checkboxes and submit | Devpost | BLOCKED | User | Human review and final action |

## Judge testing instructions

**URL:** https://fieldrelay-pi.vercel.app
**Sign in:** the evaluator credentials are pre-filled — click **Continue as Demo Ops Manager**. (Typed manually: `ops.demo@fieldrelay.io` / `DemoOps2026!`)

Suggested path: Mission Control → Incidents (three seeded fictional incidents) → open one → Calls & AI Ops → open a call record → Settings, which shows the live call target as read-only.

**This environment cannot place a real phone call.** It runs with `CALL_E_MODE=demo`, carries no CALL-E credential, and refuses runtime changes to the call target, so no visitor can spend the project's metered calls. Every call it creates is labelled `simulated`. Evidence of the real call FieldRelay placed through CALL-E — including the structured result it returned — is in `docs/CALL_E_RUNTIME_PROOF.md` and in the demo video.

Architecture: Angular SPA served as static output, the whole NestJS API in one serverless function on the same origin, Neon PostgreSQL. Routes are closed by default behind a session guard; an unauthenticated request to any data or call route returns 401.

## Prizes and where FieldRelay competes

$10,000 total: Most Practical Use Case ($4,000), Most Innovative Use Case ($3,000), two Honorable Mentions ($1,000 each), and five Most Valuable Feedback awards ($200 each). Feedback on the CALL-E platform is separately rewarded, so the integration friction encountered while building — the beta API's client-rendered reference, the undocumented webhook signing scheme, and the absent structured-result contract — is worth submitting through the official feedback form.

## Official integration surfaces

CALL-E offers MCP, SDK (`@call-e/calle@beta`), REST API, CLI (`@call-e/cli`) and a portable Skill. FieldRelay uses the REST API directly from its NestJS backend (see ADR-004), which is the surface that most directly evidences "CALL-E imported and actually called at runtime".

## Official judging criteria

All four are equally weighted: Real World Impact, Quality of the Idea, Technical Implementation, and Product Experience & Demo. FieldRelay’s evidence chain is the real incident workflow, closed-loop multi-party coordination, runtime CALL-E execution, and polished responsive product.

## Required submission fields captured

Submitter type; countries; app status and in-period changes; testing instructions; optional demo URL; upstream PR URL; CALL-E email; primary use case; one-sentence real-world task; age, country, and conflict attestations. A public YouTube/Vimeo video is mandatory; website and zip are not.

## Official community reference

Use `CALLE-AI/awesome-phone-call-agents` for contribution structure and safety patterns: provider separation, dry-run paths, masked numbers, explicit side effects, cancellation, consent, idempotency, result handling, and credential boundaries. Reuse MIT-licensed code only when it is a direct fit and preserve notices.
