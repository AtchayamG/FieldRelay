# Task Status

## 2026-07-24

- Blueprint package: Complete and audited
- Reference mockups: Complete (90 images); Mission Control desktop/mobile visually inspected
- Git baseline: clean `main` at `3e33220`, remote verified
- Official CALL-E rules: verified; submissions open
- Eligibility/legal attestations: BLOCKED on user confirmation
- Deadline: RISK due official prose/key-date time conflict; use earlier 11:45 AM SGT until clarified
- External agents: Claude Code 2.1.207, Antigravity 1.1.4, Hermes 0.18.0 available
- Architecture/folder structure: selected
- Delivery/evidence plan: created
- Application implementation: persisted incident vertical slice and durable simulated-call task slice integrated on `codex/devpost-foundation`
- Frontend: Ionic Angular 20 sign-in, responsive shell, Mission Control, API-backed incident list/create/detail, and simulated-call queue/detail routes
- Verification: frozen install, lint, strict typecheck, 139 tests, production build, dependency audit, PostgreSQL 17 integration, and browser runtime checks pass
- Browser coverage: incident create/detail/search/filter and call queue/detail/filter flows; empty and validation states; dark/light themes; desktop and 430 px mobile; no horizontal page overflow; clean console
- Backend security boundary: authorized contact IDs only; bounded inputs; atomic call reservation/task persistence; explicit simulated adapter; ambiguous outcomes are non-redialable
- Call read APIs: `GET /api/v1/calls` and `GET /api/v1/calls/:callTaskId` with bounded filters and cursor pagination
- Call operations UI: persisted queue/detail records, status and incident filters, mobile cards, visible simulation disclosure, and non-redialable `outcome_unknown` reconciliation guidance
- Frontend safety boundary: demo-only credentials, explicit simulated labeling, unavailable routes/actions disabled rather than faked
- CALL-E real-call proof: BLOCKED on credentials and authorized test number; safe demo adapter remains in scope
- Release risks: Node must be upgraded from 22.9 to >=22.12; initial frontend chunk is 1.23 MB

## 2026-07-25

- Gap analysis: complete — 25 tracked gaps in `docs/GAP_ANALYSIS_AND_DELIVERY_BACKLOG.md`, ordered into seven execution tracks
- Approved direction: Track 0 hygiene first; CALL-E via the MCP connector behind `CallEPort`; all 15 routes in scope; `main` as the working baseline with short-lived `codex/*` branches per track
- Provider callback and reconciliation slice: verified (lint, strict typecheck, 96 passing tests with 15 PostgreSQL-dependent tests skipped) and committed
- Repository hygiene: `.gitattributes` added so line endings no longer depend on per-machine `core.autocrlf`; the previously reported 156-file dirty tree was a cross-platform inspection artifact, not real churn
- Environment template: duplicated `FRONTEND_ORIGINS` removed and the required `CALLBACK_SIGNING_SECRET` documented
- Highest open risks: no live CALL-E adapter (G1), no API authentication or authorization on any route (G14), nine of fifteen routes unimplemented (G7), no deployable artifact or judge environment (G5)
- Official hackathon research: CALL-E offers MCP, SDK, REST API, CLI and Skill surfaces; deadline confirmed as 2026-09-14 23:45 SGT; new accounts include 20 free calls; submission requires a PR to `CALLE-AI/awesome-phone-call-agents`, a public sub-three-minute video and the CALL-E account email
- CALL-E integration: `CalleApiAdapter` calls `POST /v1/calls` behind `CallEPort` with bearer auth, a per-task idempotency key, a purpose-derived brief with mandatory disclosure, a closed result schema and a webhook URL (ADR-004 supersedes ADR-003)
- Call safety: `CALL_E_MODE` defaults to demo and only the exact value `live` enables dialling; live mode fails at boot on invalid configuration; phone numbers exist only in `CALLE_DIAL_TARGETS` and are validated at boot
- CALL-E webhook: token-authenticated route translating provider deliveries into the existing replay-safe callback pipeline, discarding transcripts, recordings and structured results
- Toolchain: Node upgraded to 24.18.0 LTS, clearing the `>=22.12` engine blocker and the Vite engine warning
- Verification: lint, strict typecheck, 198 tests and production builds pass
- Remaining on the CALL-E proof: a CALL-E API key and an authorized test number, both user-supplied

## 2026-07-26

- CALL-E runtime proof: COMPLETE — FieldRelay placed call `call_MzD1ou1AbX1XtYkTnxMCBA`, which returned `{available: yes, quoted_amount_text: $35}` with 0.82 confidence and round-tripped the call task IDs; recorded in `docs/CALL_E_RUNTIME_PROOF.md`
- API key: created self-service in the CALL-E dashboard (free, 2 per account, 90-day expiry); stored only in the git-ignored `.env`
- Session boundary: global guard closes every route by default; HMAC tokens with expiry; anonymous call initiation returns 401 and never reaches the provider
- Operator-changeable call target: Settings screen plus `GET/PUT/DELETE /api/v1/settings/dial-target`, gated by `CALLE_ALLOW_RUNTIME_DIAL_TARGET` (default false), numbers validated, contact-bound, masked in responses and audit
- Deployment: multi-stage Dockerfiles for API and web, `docker-compose.judge.yml`, nginx same-origin proxy with CSP and security headers
- Defects fixed: idempotency foreign key had no delete rule so call tasks could not be purged (migration 0004); CALL-E request timeout raised 15s to 45s after a client timeout abandoned an accepted call and a naive retry dialled twice
- Agent documentation: `docs/SYSTEM_STATE_FOR_AGENTS.md` added and `AGENTS.md` updated with the non-negotiable call-safety rules
- Verification: lint, strict typecheck, 258 tests with PostgreSQL 17, production builds — all pass
- Remaining highest-priority: deploy the judge environment to a public URL and capture testing instructions; then ingest structured call results to open the approval and dispatch loop

- Live judge environment: DEPLOYED to https://fieldrelay-pi.vercel.app (Vercel: static SPA + whole NestJS API in one serverless function + Neon PostgreSQL, five migrations applied, three seeded incidents)
- Live verification: health 200, anonymous read 401, demo login issues an operator session, incidents load, call returns simulated, dial-target change returns 403, SPA deep links resolve, CSP present
- Deployed environment cannot place a real call: CALL_E_MODE=demo, no CALL-E credential present, runtime dial-target changes refused

- UI polish: 39-icon Material-style system replaced every emoji app-wide; password reveal toggle; sign-out icon made visible (it inherited an unset colour); call counter centred above the adapter card; mission waveform rebuilt as 28 fixed-width ticks with deterministic heights
- Judge live calls: deployment switched to CALL_E_MODE=live with runtime dial-target changes enabled, so a judge can enter their own number in Settings and receive a real call; kill switch is CALL_E_MODE=demo, effective on the next request without redeploy
- Call counter: reports calls PLACED, never remaining — CALL-E exposes no balance endpoint, its published allowance differs between sources (20 on Devpost, 200 on heycall-e.com), and it can be topped up; seeded with 3 calls made outside this deployment via CALLE_CALLS_PLACED_ELSEWHERE
- Structured outcome ingestion (step 1 of the closed loop): migration 0006_call_outcomes, schema-validated acceptance that drops undeclared keys and refuses out-of-enum values, and toProviderSchema stripping locally-enforced bounds before transmission; 225 API tests pass
- Structured outcome ingestion COMPLETE on the backend: PostgreSQL and in-memory repositories on UnitOfWork, webhook translator carries the answer forward while still discarding transcripts, recordings, the recipient number and the provider summary, and ProcessProviderCallbackUseCase validates and stores it in the same transaction that accepts the callback
- Outcome audit records field names only, never the answers; `call.outcome.recorded` and `call.outcome.recorded_with_validation_failure` are distinct actions so calls that connected but produced nothing usable are findable
- Verification: lint, strict typecheck, 232 API tests (15 PostgreSQL-dependent skipped without a local database); run record in `docs/agent-runs/2026-07-26-structured-outcome-ingestion.md`
- Outcome exposed end to end: `GET /api/v1/calls/:callTaskId` returns `CallTaskDetailDto` with the outcome read in the same transaction as the task, and call detail renders it as a primary panel showing the validated fields, task completion, confidence, and an explicit warning when part of the answer failed validation
- Migration 0006_call_outcomes applied to the deployed Neon database
- Verification: lint, strict typecheck, 232 API and 107 app tests, production builds — all pass
- Approvals backend: migration 0007_approvals, Approval entity, single-source approval policy returning explainable reasons, list and decide use cases, PostgreSQL and in-memory repositories, and `GET /api/v1/approvals` plus `POST /api/v1/approvals/:id/decision`
- Approval accountability rules: a second decision is refused rather than overwriting the first; a decision against a superseded outcome is refused; the approver comes from the signed session, never the request body; the audit records whether a note was left, never its text
- Approvals are raised inside the same transaction as the outcome that triggered them, one per call task, idempotent under webhook redelivery
- Verification: lint, strict typecheck, 253 API tests; migration 0007 applied to the deployed Neon database
- Approvals UI: `/approvals` route live in the sidebar and bottom navigation, status filters, each card showing why the decision is required alongside the answer being decided on, an optional operator note recorded against their name, and API refusals surfaced rather than swallowed
- Seven of fifteen designed routes now built: sign-in, Mission Control, Incidents (list/detail/create), Calls (queue/detail), Settings, Approvals
- Verification: lint, strict typecheck, 253 API and 116 app tests, production builds — all pass
- Winning-strategy research: analysed the UiPath AgentHack 2026 verified winner set (14 of 203 carry Devpost Winner tags) plus the confirmed Most Creative Solution page; recorded in `docs/WINNING_STRATEGY.md` and saved as the reusable `hackathon-winning-strategy` skill
- Key finding: 7 of 14 winners led their pitch with what their AI refuses to do; FieldRelay's refusal inventory is longer than any winner reviewed but is invisible in the product's own voice
- Key finding: the confirmed winner built a dashboard expressly so judges could see invisible agent work, and listed HMAC webhook authentication as future work — FieldRelay shipped that weeks ago
- Scorecard: 74.4/100, with every lost point in narrative and demo rather than engineering
- Priority change: wiring Mission Control to real data now outranks new routes, because it is the judge-visible surface
- Mission Control on real data: `GET /api/v1/mission-control` assembles counts from rows that exist; the activity feed describes what calls actually returned; approve/reject replaced by a link to Approvals so money is never committed from a summary card
- Guardrail panel shipped — "What FieldRelay refuses to do", reported from live configuration, with relaxed guardrails rendered in warning colour rather than hidden. This is the judge-visible surface the winning pattern calls for
- Problem evidence: `docs/PROBLEM_EVIDENCE.md` records sourced figures in three confidence tiers, separating professional-body sources from vendor marketing; no FieldRelay time-saving claim is made because none has been measured
- Golden demo: `docs/GOLDEN_DEMO_SCRIPT.md` — a sub-three-minute shot list built around the refusal as the money shot, with a pre-flight checklist, a five-clean-runs reliability gate and a failure plan
- Verification: lint, strict typecheck, 253 API and 120 app tests, production builds; deployed and confirmed live
- Next: Dispatch, then the Devpost write-up rewritten refusal-first, then remaining routes

- Upstream PR: **OPEN and MERGEABLE** — https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107, +631 across 8 files, opened with the user's explicit approval. This clears the hard submission requirement
- Upstream contribution: `skills/service-dispatch-call/` from branch `feat/service-dispatch-call`, commit `00b2a73`; zero commits behind `upstream/main` at the time of opening; no CI checks are configured on the upstream repository, so `validate_repository.py` passing locally is the only gate
- Contribution shape: a portable skill (SKILL.md plus five references — safety, examples, result-schema, ambiguous-outcomes, idempotency), generalising FieldRelay's guardrails rather than submitting the monorepo; fills the `service dispatch` slot the upstream README lists as wanted and had nothing in
- Upstream compliance: branch name validated with `scripts/check_branch_name.py`, Conventional Commits title, `python scripts/validate_repository.py` passes, all example phone numbers fictional; the validator additionally requires `references/examples.md` in every skill directory, which is not documented in the README
- Upstream PR is BLOCKED on explicit user approval — it publishes content to a third-party repository under the user's GitHub identity, and AGENTS.md requires approval for that step
- Demo narration: eight segments generated and timed; cue sheet in `docs/DEMO_NARRATION.md`
- DEFECT (mine): narration was generated on paid Higgsfield credits when the user had said "the installed TTS voices", meaning the free local ones. 9 generations spent before the user stopped it. Superseded — do not use Higgsfield for this project
- Narration timing (voice-independent, still valid): 121.2s of voiceover across a 180s video; every beat fits except the close, which must start at 2:53 rather than 2:55 or the video lands at 3:01 and breaches the Devpost limit
- Demo video plan: `docs/DEMO_VIDEO_PLAN.md` — free toolchain confirmed installed (edge-tts 7.2.7, ffmpeg/ffprobe), modelled on the Sahaaya submission pipeline
- Reference read: `OpenAI Hackathon/Sahaaya` shipped 1920x1080/30fps/h264, 132s, with edge-tts narration at 24 kHz mono — the same sample rate as the paid output, so there is no quality argument for paying
- Format decision: borrow Sahaaya's pipeline, REJECT its stills-and-narration format. The winning-strategy demo gate requires the system visibly acting, not slides, and FieldRelay's real ringing phone is its most persuasive asset
- Voice SELECTED by the user: **en-US-SteffanNeural**, chosen from four free samples in `assets/demo/voice-samples/`
- Narration REGENERATED free with edge-tts via `scripts/generate-narration.py`, which is now the single source of truth for the voiceover and reprints a slack table on every run
- Edge-tts has no emotion parameter, so per-beat intensity is expressed via `--rate` and `--pitch`; the refusal beat is slowest and lowest at -10% / -2Hz
- Beat windows RE-TIMED for this voice: Steffan reads slower, so the windows were rebalanced rather than the reads rushed. 144.7s of narration in a 174s timeline, inside the 180s ceiling
- Beat 4 keeps a deliberate 12.9s of slack because that slack is the real call playing; later edits must take time from beats 1, 3 or 5 instead
- Captions: per-segment SRT generated alongside the audio. Two traps handled — this service emits `SentenceBoundary` not `WordBoundary` (feeding only WordBoundary yields empty files), and raw cues overlap by tens of milliseconds, which YouTube's uploader flags, so each cue end is clamped to the next cue start
- Close line: both takes rendered. `08-close.mp3` says "a single dollar" and matches the $35 on screen; `08-close-alt-rupee.mp3` preserves the original tagline. Decision deferred to the edit
- Verification this session: lint clean, typecheck clean, 375 tests pass (253 API + 120 app + 2 tokens), 15 PostgreSQL-dependent skipped without a local database; deployment live, anonymous read correctly 401

- OFFICIAL JUDGING CRITERIA READ (this supersedes the generic 92/100 scorecard, which was scored against the internal playbook and not against this hackathon): four equal criteria — Real World Impact, Quality of the Idea, Technical Implementation, Product Experience & Demo. The demo video is therefore roughly a quarter of the score and is the largest single gap
- Criterion 2 explicitly asks whether the contribution is "clear, well-scoped, and reusable by the community", so PR #107 is scored work rather than a submission checkbox and should be foregrounded in the write-up
- Criterion 3 explicitly requires "CALL-E imported and actually called at runtime, not just referenced" — `docs/CALL_E_RUNTIME_PROOF.md` answers this directly
- Prize split is Most Practical ($4,000) vs Most Innovative ($3,000); FieldRelay is a practical use case and the write-up should aim there rather than straddle
- MISSED PRIZE CATEGORY, still open: "Most Valuable Feedback", 5 winners at $200 plus 10,000 credits, requiring only the CALL-E feedback survey. Material already gathered the hard way — README documents a singular `recipient` while the OpenAPI spec takes a `recipients` array; the webhook nests the call at `data.id` under an event-level `id`; no balance endpoint exists; the free-call allowance is stated as 20 on Devpost and 200 on heycall-e.com; no webhook signing scheme is published; unsupported JSON Schema keywords risk rejecting a whole call
- DEFECT FIXED — Mission Control's Orchestration Flow rendered a header plus a hardcoded badge reading `INC-2026-9041 Pipeline` above an empty body, because the API adapter returned an empty array. On the deployment that was a fake incident reference over a blank box on the first screen a judge opens
- Orchestration Flow now derives every step from the most recent call task: authorisation, reservation before dialling, placement, the answer, its validation, and the approval gate. Where the system stopped itself the step says so — an unknown outcome states it will not be redialled and refuses to mark anything downstream complete. The section hides entirely when no call exists
- Second defect, found only by querying the live deployment rather than trusting fixtures: the seeded task is `queued`, which rendered "Waiting to dial" above a description claiming the call had been placed, and marked two steps active at once. Both fixed and covered by tests
- Tests now 384 (253 API + 129 app + 2 tokens); 10 of the new ones encode the orchestration refusals; deployed and re-aliased to https://fieldrelay-pi.vercel.app

## 2026-08-07 — brand and design system

- Design tooling INSTALLED into the repo: 12 Agent Skills under `.agents/skills/` and `.claude/skills/` — taste-skill (`design-taste-frontend`), `high-end-visual-design`, `impeccable`, and Emil Kowalski's nine animation/design skills
- IMPORTANT SCOPE FINDING: two of the three reference skills are written for landing pages. Taste-skill's own first line reads "Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI." Impeccable's **Operate** mode is the correct frame for this app — "scanability, consistency, native expectations outrank expression; brand lives in precise details"
- `docs/DESIGN_SYSTEM.md` records exactly which rules are taken (banned fonts/icons/shadows, double-bezel trays, concentric radii, custom easing, shape-consistency lock) and which are refused (macro-whitespace, hero typography, floating pill nav, asymmetric bento). Applying landing-page rules to a dense ops console is the mistake those skills warn about
- Direction SELECTED by the user: **Machined Graphite** — near-black warm canvas, nested trays, hairlines, one rationed signal accent. Sequencing also selected: design system first, routes second, film last
- Logo REPLACED: "Signal and Gate" (`shared/components/logo/logo.component.ts`) — an incident sends a call outward as two arcs and the call stops against a solid bar, so the mark is the product thesis. The old mark was a lightning bolt in a rounded-square tile on a purple-to-cyan gradient: three of the most-named tells of generated UI in one 38px box, saying "energy" about a product about restraint
- Logo is `currentColor` for strokes and gate so it re-themes with the shell; strokes thicken as it shrinks; the far wave drops below 18px where it reads as noise. Favicon replaced with the same mark
- Typography: Inter and JetBrains Mono RETIRED for **Geist and Geist Mono**, both verified present on Google Fonts. Inter is the single most recognisable typographic tell of generated UI. Fallback chain degrades to the platform grotesque, never Arial
- Tokens added: `--fr-color-signal` (both themes), `--fr-tray-pad/-radius/-radius-inner`, `--fr-hairline`, `--fr-hairline-strong`, `--fr-tray-shell`, `--fr-tray-inner-lip`, `--fr-ease`, `--fr-shadow-tray`, `--fr-shadow-raised`. Dark palette moved from blue-black to warm graphite with every accent desaturated one step so nothing glows
- Detector baseline BEFORE: 12 anti-patterns, 11 of them the same one — `side-tab`, a thick coloured border down one card edge, which impeccable calls the most recognisable tell of AI-generated UI. Twelfth was the sidebar animating `width`
- Detector AFTER: **zero**. State now travels as a labelled dot or as the text itself. Metric card carries a 6px dot beside its label; active nav row gets a short inset signal rule; approvals list drops a warning bar that appeared on every card and so carried no information; call-outcome panel drops a green edge that read as "this answer is good" on a panel built to show answers that may have failed validation; guardrail panel drops a green edge that contradicted its own amber rows
- HONESTY DEFECT FIXED: the performance panel reported `SLA Compliance (0%)`, `Automated Resolution (0%)` and `Vendor Dispatch Success (0%)` above three empty bars. Nothing had ever measured them — the figure was a struct default rendered as a claim that the system meets its SLA zero percent of the time, on the first screen a judge opens. It now states which measurement each rate is waiting on
- Approvals queue given an empty state: an empty queue is the good state, not a failed fetch
- Both of the last two defects were found by querying the LIVE deployment, not by reading fixtures. Both passed every test. Recorded as a trap in `docs/SYSTEM_STATE_FOR_AGENTS.md`
- `AGENTS.md` extended with non-negotiable design rules and a "never render an unmeasured value as a figure" rule, both now as binding as the call-safety rules
- Verification: lint clean, strict typecheck clean, **385 tests** (253 API + 130 app + 2 tokens), production build passes, detector zero, deployed and live at https://fieldrelay-pi.vercel.app
- Next, in order: rebuild remaining existing screens onto the tray construction → Dispatch Board → Vendors → Technicians → Analytics → polish → record the demo
- STILL THE LARGEST GAP: the demo video, a full quarter of the official judging criteria, remains unrecorded

## 2026-08-07 (later) — light theme repair

- USER-REPORTED: the app name was invisible in the light-theme header, and retired neon purple was still showing in places. Both confirmed and fixed
- ROOT CAUSE 1 (wordmark): the logo referenced `--fr-color-text-primary` and `--fr-color-text-tertiary`, neither of which exists in this system, each with a hardcoded near-white `var()` fallback. The fallback did its job silently and painted white text on a white header. Now reads `--fr-color-text` and `--fr-color-muted`
- ROOT CAUSE 2 (purple): only the DARK token block was converted in the first Machined Graphite pass. The light block still carried `#6D28D9` primary, `#8B5CF6` primary-bright and blue-tinted neutrals `#F4F7FC`/`#DCE5F2`, so light mode kept rendering the retired identity
- Light theme now the counterpart of dark: warm graphite neutrals, no purple, shadows tinted to the canvas hue, and the coloured accent glow on `--fr-shadow-primary` removed. Nothing in either theme glows
- Last purple removed from `manifest.webmanifest` (`theme_color` was still `#7C3AED`)
- ACTION COLOUR CHANGED: `--fr-color-primary` is now ink (`#1A1B1F` light, `#EDEBE8` dark) rather than bronze. It fills every primary button through one token, and a bronze fill was spending the signal amber on "New Incident" — a control always present and never urgent, which destroys the rationing rule that makes the accent mean anything. `--fr-semantic-ai-action` now reads from signal directly
- NEW TOOL: `scripts/check-tokens.mjs` finds referenced-but-undefined CSS custom properties and flags those masked by a `var()` fallback. Written because a fallback hides a typo rather than surfacing it. Currently 66 defined, 57 referenced, all resolving
- Verified visually on the live deployment in both themes, not just in fixtures
- Verification: lint clean, strict typecheck clean, 130 app tests, detector zero, token checker clean, deployed and live
- Remaining before submission: open the upstream PR (user approval), record the golden demo, architecture diagram, gallery screenshots, Dispatch route, and the user-only items (CALL-E account email, attestations, video upload, final submit)
