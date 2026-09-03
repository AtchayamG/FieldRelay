# Task Status

- 2026-09-03 live evidence call and film refresh: after the user's action-time confirmation, the
  production incident flow created exactly one non-simulated, zero-retry task, `CALL-2042-0004`.
  The phone recording and provider output agree on the bounded result: available `yes`, quoted
  amount `$40`, earliest ETA `1440` minutes, confidence `0.9`. Read-only provider reconciliation
  moved the same durable task from `queued` to `completed`; no redial occurred. Replaced the
  walkthrough's historical `$35` evidence section with the new production result and a 23.96-second
  excerpt authorized by the user, visibly labelled `EDITED FOR TIME`. The master remains H.264/AAC,
  1920x1080, 30 fps, 2:59.861, 12,615,620 bytes; mean audio -22.2 dB, peak -5.0 dB; SHA-256
  `4d68d0f6b762f9a5510b3edef224f6ae3ade61ba83c6633d649ed26303de89b4`. Raw audio and transcript
  remain outside the repository. Public YouTube replacement and Devpost link update are pending
  action-time confirmation.

- 2026-09-03 external release closeout: corrected both the public Devpost story and judge testing
  instructions so they truthfully state that production is intentionally in exact live mode and
  bounded to the single provisioned, authorized target. Read back the public project page and
  confirmed the new wording plus the existing submitted status. Submitted the official CALL-E
  Additional Calls Request Form for 200 calls; the form displayed `Your response has been recorded`
  and Gmail received the response receipt. Sent CALL-E support the verified provider task id and
  23-second first-audio-delay report; Gmail displayed `Message sent`. No call was placed.

- 2026-09-03 release closeout: committed and pushed `1e50946` (`chore: patch qs audit
  advisory`). GitHub Actions run `33678645033` passed the frozen install, lint, strict typecheck,
  PostgreSQL migration and full test suite, production build, design-token verification, and
  `pnpm audit --prod`. Vercel production deployment `dpl_CpbMihM42QgSMSXeNs75xKcYfabD` reached
  Ready and `fieldrelay-pi.vercel.app` was moved to it. Public health and evaluator sign-in return
  200; the in-app browser reaches Mission Control and loads the call queue. Authenticated reads for
  dial-target settings, calls, incidents, approvals, dispatches, vendors, and analytics return 200.
  The configured target remains masked and callable in `IN` / `en-IN`; historical non-simulated
  `CALL-2042-0003` remains `completed`. No real call was placed.

- 2026-09-02 CI dependency audit repair: after pushing the final public sync, GitHub Actions run
  `33654938337` passed lint, typecheck, database migration, tests, build, and design-token
  verification, then failed `pnpm audit --prod` on a newly reported moderate `qs` advisory under
  Express. Tightened the existing package-manager override from `>=6.15.2` to `>=6.16.0`, refreshed
  `pnpm-lock.yaml`, and verified local `pnpm audit --prod` now reports no known vulnerabilities and
  `pnpm install --frozen-lockfile` accepts the lockfile.

- 2026-09-02 final public sync check: user approved pushing the release work and keeping
  production in exact live mode for judges. Public `/health` and `/api/v1/auth/session` return 200;
  in-app browser sign-in reaches Mission Control, though cold start can leave the button on
  `Verifying Session...` long enough to look stuck. Authenticated production reads for dial-target
  settings, calls, incidents, approvals, dispatches, vendors, and analytics all return 200. Settings
  report one configured callable target in `IN` / `en-IN`, runtime target changes allowed, and the
  live adapter remains selected. CALL-E PR #107 remains approved and merged. No real call was placed;
  provider voice-start latency remains the only live-call risk.

- 2026-09-02 public-release parity audit: the five latest `AtchayamG/FieldRelay` GitHub Actions runs
  are green; public `origin/main` remains at `4ead8ab`, while deployed release commit `423d60e` is
  local and awaits push approval. CALL-E contribution PR #107 is now authoritatively `APPROVED` and
  `MERGED`. The public Devpost page resolves the correct live app, YouTube video, repository, runtime
  proof, and merged contribution, but one sentence still describes the evaluator as simulated even
  though production is intentionally in exact live mode for judges. A public text correction awaits
  explicit approval. Production `/health` returned 200 during the audit; no call was placed.

## 2026-09-02 — production and CALL-E record recheck

- User approved deploying the reconciliation update while retaining exact live mode. Remote-built
  Vercel deployment `dpl_6cUXecjxzyhRHYw7LnnQqsXSS1cy` is Ready and serves the custom production
  alias. A local-prebuilt attempt omitted Nest serverless dependencies; it was immediately rolled
  back to the healthy prior deployment, then replaced by the successful remote build. Health was
  verified at each recovery boundary.
- Applied reconciliation exactly once to historical `CALL-2042-0003`. Production now reports
  `completed`, non-simulated, bounded outcome present, `taskCompleted: false`, confidence high, and
  schema validation passed. This made no call and performed no retry or redial.
- In-app production verification confirms the visible reconciled call detail, live adapter, masked
  configured `IN · en-IN` target, and no browser-console errors.

- Read today's relevant CALL-E monthly-usage email and matched its call identifier against the
  authenticated CALL-E dashboard. The August 10 attempt was billed at USD 0.05 for 45 seconds in IN.
- Provider conversation detail proves the FieldRelay task reached the voice runtime, but the first bot
  speech began only around 23 seconds after connection. The earlier “silent call” report is therefore
  a confirmed excessive voice-start delay, not an empty prompt. No new call was placed.
- Production demo sign-in works. Mission Control plus incidents, calls, dispatch, approvals,
  technicians, vendors, analytics, and settings loaded without application-error states. Exact live
  mode and the masked authorized `IN · en-IN` target remain configured.
- Vercel reports production Ready. The latest `main` CI run at `4ead8ab` passes, as do the preceding
  four `main`/merge runs. CALL-E's public create-call contract exposes no documented greeting-delay
  control, so a fresh judge call is not yet guaranteed to speak promptly.
- Current local release gate: lint, strict typecheck, production build, token checker, impeccable
  detector, and 430 non-database tests pass (293 API + 135 app + 2 design tokens). The 15 PostgreSQL
  integration tests could not be rerun because Docker Desktop is stopped; their last database-backed
  run remains 15/15 passing on 2026-08-16 and the verified production/CI revision is unchanged.
- Added a Clean Architecture read port and authenticated call-detail reconciliation action for
  webhook loss. It reads only an existing CALL-E task, rejects mismatched identities and simulated or
  already-terminal tasks, and applies bounded status/outcome data through the established replay-safe
  callback transaction. It cannot start or retry a call. Focused verification: 293 API tests and 135
  app tests pass; lint, strict typecheck, production build, token check, and impeccable detector pass.
- Corrected stale security documentation and code comments that had described the public evaluator
  deployment as incapable of dialling. Production is intentionally live, so published evaluator
  credentials are not a call-budget control; the current boundary is one provisioned contact,
  declared purpose, bounded retries, durable idempotency, and supervised public-live exposure.
- Release security recheck reports no known production dependency vulnerabilities and no
  high-confidence credential pattern in the working tree. Corrected the demo-render ignore rule so
  generated build frames cannot be added accidentally.
- Production-target `vercel build --prod` passes and produced a deployable local output without
  publishing. Pinned the root engine to Node `24.x`, matching CI and Vercel's supported LTS runtime,
  instead of allowing an unreviewed future major upgrade.

## 2026-08-16 — Devpost submission verified

- Created FieldRelay project `1387409`, uploaded the approved thumbnail, synchronized the final narrative, technology stack, live demo, public repository, merged CALL-E PR, and YouTube video, then submitted to `CALL-E: Your Code Is Calling` with the user-confirmed custom answers and legal declarations.
- Devpost returned submission ID `1140281`, status `Submitted`, at `2026-08-16T08:08:47.215-04:00`. Required live readback confirms state `published`, video `https://youtu.be/tq6L4HOqRXQ`, hackathon `call-e`, and public project `https://devpost.com/software/fieldrelay`.
- Post-submit QA removed an internal draft heading/checklist and corrected text-transfer punctuation from the public story. A second live readback confirms the clean story and unchanged hackathon submission timestamp.

## 2026-08-16 — YouTube publication and Devpost registration

- Published the approved 2:59.861 FieldRelay walkthrough publicly at `https://youtu.be/tq6L4HOqRXQ` with the approved thumbnail, title, description, and not-made-for-kids audience setting. YouTube copyright checks report no issues; unauthenticated oEmbed metadata resolves successfully.
- Registered Atchayam G for `CALL-E: Your Code Is Calling` through the official Devpost connection using the user-confirmed solo profile, eligibility, rules agreement, and registration answers.
- Official live submission requirements were re-read and the exact create-and-submit payload is ready. Security scan passes with no exposed secrets or tracked credential files. Final Devpost project creation/submission awaits the required explicit confirmation.

## 2026-08-16 — full-content video framing correction

- Corrected the over-cropped walkthrough after frame-level user review. Removed screenshot zoom, pan, and horizontal shifts that hid useful application content.
- Dense application pages and the architecture flow now use full-frame containment. Sparse pages use conservative top-aligned framing that trims only empty bottom workspace; controls, navigation, lifecycle columns, cards, metrics, and architecture lower panels remain visible.
- Verification: Remotion lint/type pass; eight representative stills and a nine-frame contact sheet visually reviewed; H.264/AAC 1920×1080 at 30 fps; 179.861 seconds; 15,577,376 bytes; audio mean -22.4 dB and peak -5.2 dB. Video SHA-256 `6d5c91a16beebe9b6a259e2f57d0ce34a33a342989cfb2c87b4a064fc86c4c9b`. Thumbnail remains unchanged.

## 2026-08-16 — presentation redesign and thumbnail

- Rebuilt the walkthrough presentation after user review: warm editorial slide backgrounds now surround the authentic dark application, replacing the previous nearly all-black film.
- Reframed the application scenes on a lighter editorial canvas. This first pass was subsequently superseded by the full-content framing correction above.
- Created `assets/demo/fieldrelay-thumbnail.png`, a deterministic 1280×720 thumbnail inspired by Sahaaya's successful editorial composition and built from real FieldRelay call/approval screens. Generative footage was intentionally unnecessary.
- Verification: Remotion lint/type pass; eight representative stills plus nine-frame contact sheet reviewed; H.264/AAC 1920×1080 at 30 fps; 179.861 seconds; 27,973,217 bytes; audio mean -22.4 dB and peak -5.2 dB. Video SHA-256 `af4c075ddbc59f2151c7b617faf639481afab941236d573e0425452ffa709415`; thumbnail SHA-256 `24e98e98b9505c79736d376721549766ee25bb294444af11e019f948c4995970`.

## 2026-08-16 — detailed Devpost walkthrough correction

- Replaced the short evidence-reel framing with a 2:59.861 narrated walkthrough that explains FieldRelay's idea and the complete working application: evaluator session, incidents, Calls & AI Ops, live-mode behavior, call detail, verified historical live structured outcome, human approval, dispatch, vendors, analytics, architecture, and public/upstream proof.
- Corrected the approval scene after visual QA found an empty queue: the film now shows the real approved `$35` quote, `0.82` confidence, operator decision, and release control.
- Truthfulness remains explicit: the evaluator adapter is simulated; live CALL-E behavior is explained; the separately labelled result is historical verified live evidence; no new call was placed.
- Verification: Remotion lint/type pass; H.264/AAC 1920×1080 at 30 fps; 179.861 seconds; 14,301,850 bytes; mean audio -22.4 dB, peak -5.2 dB; stills and nine-frame contact sheet visually reviewed; SHA-256 `a2e637a4322fb4f339724c438736ae9f1de47ce857741807fe097f247eed940a`.

## 2026-08-16 — submission release audit, call-detail alignment and final-video rebuild

- Corrected the desktop call-detail geometry: the page now shares the call queue's 1400px cap and is left-anchored in the shell canvas, reducing the sidebar-to-content gap from roughly 310px to the intended 48px gutter at 1920×1080.
- Fixed adapter-selection isolation so demo mode returns before any dial-target resolver is constructed; exact `CALL_E_MODE === 'live'` remains unchanged and live target parsing now uses only the supplied environment.
- Made PostgreSQL integration timing tolerant of a pooled remote TLS connection without weakening assertions.
- Captured a 41-second 1920×1080 production walkthrough with zero console warnings/errors during the successful run and 200 responses across auth, usage, Mission Control, calls, call detail, approvals, dispatches and vendors.
- Built an original 2:15 landscape Remotion submission candidate from the deployed-app capture, archived verified CALL-E result and architecture evidence. The evaluator call is visibly simulated; the historic live result is separately labelled; no new call was placed and no third-party music is used.
- Verification: 438/438 tests with PostgreSQL (303 API + 133 app + 2 tokens), ESLint, strict typecheck, production build, token checker, and impeccable detector zero. Video lint/type check, H.264/AAC encode, nine-frame contact-sheet review, media probe, loudness scan and SHA-256 verification pass. Final asset: `assets/demo/fieldrelay-demo.mp4`, 2:15.061, 8.14 MB.

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

## 2026-08-07 (later still) — colour restored, Cobalt Ops

- USER-REPORTED and CORRECT: the app had been reduced to black and white and looked like "an old age black and white movie". This was my error, not a hallucination — a deliberate but wrong design call
- ROOT CAUSE: I wrote a rule that the accent should be "rationed", then applied it literally. Desaturating every semantic colour and then making primary buttons pure ink drained the product to greyscale with a single amber dot
- WHY IT WAS WRONG TWICE: austere is not premium, and in an operations console **status colour is functional** — an operator must tell CRITICAL from DISPATCHED by hue at a glance without reading the label. Removing that was a usability regression dressed as restraint
- DIRECTION SELECTED by the user from three rendered options: **Cobalt Ops**. Cobalt carries actions, links and focus; the status ramp runs at full strength in both themes
- Cobalt chosen specifically because a screen full of red, amber and green has a blue-shaped hole in it — the accent never collides with a state colour
- Status colours run brighter in dark theme than light, because a pill nobody can read at a glance is decoration rather than information
- `--fr-color-signal` and `--fr-color-primary` are deliberately the same family: "the system is working" and "you can act here" should feel related, not like two brands
- KEPT from the previous passes: the Signal and Gate mark, Geist and Geist Mono, no side-tab borders, concentric tray radii, shadows tinted to the canvas hue, one easing curve, and the honest empty states. Only the palette was rewritten
- NOT coming back: the purple-to-blue gradient. One flat accent, no gradient, no glow. The single accent-tinted shadow is a faint lift under the primary button
- Favicon, `theme-color` and the web manifest all moved to the cobalt canvas so the browser chrome matches
- The accent rule in `docs/DESIGN_SYSTEM.md` now reads "used deliberately, not sparingly", and states explicitly that status colour is not rationed at all
- Verification: token checker clean (66 defined, 57 referenced), lint clean, strict typecheck clean, 130 app tests, detector zero, deployed and verified visually in both themes

## 2026-08-07 (later still) — privacy defect, then Dispatch Board

- PRIVACY DEFECT FOUND AND FIXED: a real personal mobile number was the placeholder in the Settings call-target input, so it rendered in full on the PUBLIC deployment. It was also in the README and four test fixtures in a PUBLIC repository. AGENTS.md forbids committing personal phone numbers
- Replaced everywhere with `+919999900000`; the 99999 prefix is not an assignable Indian mobile range so the fixture cannot ring anyone. Three masking assertions updated to the new last four digits
- `.env` deliberately still holds the real number — it is git-ignored and is the legitimate place for the live dial target
- DISCLOSED to the user: four commits carry the number in public git history (`f4153f6`, `8052a86`, `836ccd6`, `72b9c1d`). User decision: **leave history as-is**
- DISPATCH BOARD SHIPPED — the loop is closed. An approved decision now becomes a vendor who is actually coming
- Dispatch is the only object in the domain that creates an obligation to pay someone, so it is the most guarded: everything before it is reversible, and a vendor who has been told to attend cannot be un-told
- Refusals it exists for: cannot be created against a pending or rejected approval; one approval releases exactly one dispatch, enforced by a UNIQUE constraint on `approval_id` rather than an application check that would be a race; cannot skip a lifecycle step or move a job that already finished; cancelling must record why
- The vendor, incident and quoted amount are read from rows, never the request body, so nothing a caller sends can redirect a dispatch to a vendor who was never called
- The quoted amount is carried forward exactly as spoken and never parsed — a dollar figure with a caveat has no correct numeric reading — and is dropped entirely when the answer failed validation. The audit records that a price existed, never the price
- Releasing is deliberately a SECOND action, separate from approving. Approving records that a person agreed to a cost; releasing is what sends someone. One click doing both would mean a vendor travels the instant a box is ticked
- New: `domain/dispatch.entity.ts`, `application/dispatch.port.ts`, `application/dispatch.use-cases.ts`, `interfaces/dispatch.controller.ts`, both repositories, migration `0008_dispatches.sql`, plus the Angular feature slice and the `/dispatch` route. Sidebar item enabled
- `DispatchInvariantError` maps to HTTP 409, not 400: the request was well-formed and the caller is not at fault — the state said no
- NEW TOOL: `scripts/apply-migration.mjs`. Prefers `.vercel/.env.production` over `.env`, because `.env` points at localhost and the deployed database lives in Vercel — applying to production is now explicit rather than an accident of file order
- Migration 0008 APPLIED to the deployed Neon database
- Verification: lint clean, strict typecheck clean, **404 tests** (269 API + 133 app + 2 tokens), production build, detector zero, token checker clean, deployed; live `GET /api/v1/dispatches` returns an empty board and an unknown approval is refused with 404
- Next: Vendors (load-bearing for the refusal story), then Technicians, then Analytics

## 2026-08-07 (continued) — call-target config, then Vendors

- CALL-TARGET CONFIG CORRECTED: `CALLE_DIAL_TARGETS` was NOT set in Vercel production. The deployed default was living only in the `runtime_settings` table, so a database reset would have left the deployment with no call target at all. Now provisioned in the environment where the architecture always said it belonged, with the database override layered on top
- README DEFECT FIXED: it claimed runtime dial-target changes were "off on the public demo". Verified against the live API that `runtimeChangesAllowed` is **true** — and deliberately so, since it is how a judge points the system at their own phone. The README was telling evaluators they could not do the one thing the demo exists for
- README now documents both sources of the number, a per-deployment table of exactly where to change each (local `.env` / Vercel env vars / docker-compose), and what stays true either way. User chose NOT to print the actual digits — a judge wants to enter their own number, not ring the maintainer's, so printing them adds public exposure with no benefit
- `.env.example` annotated to explain why the public demo sets `CALLE_ALLOW_RUNTIME_DIAL_TARGET=true` while the default is false
- VENDORS SHIPPED — the authorization boundary is now visible. Two of the strongest refusals were previously provable only by triggering a failure: "will not dial a number nobody provisioned" and "a contact authorised for one purpose cannot be called about another"
- Each contact shows what it may be called about AND what it is refused for, struck through rather than omitted, with the decisive refusal reason stated ABOVE the permissions. Non-callable contacts are dimmed, never hidden — they are the evidence
- Demo contact data extended from 2 to 4 entries so every refusal path is represented: authorised-with-number (callable), authorised-but-no-number (reaches nobody), pending, and revoked. A screen showing only working contacts would prove nothing
- Live result: **1 of 4 callable**, three different stated reasons
- PRIVACY INVARIANT: the endpoint returns whether a number exists, never the number. The resolver result is coerced to a boolean on the line it is read, so nothing downstream can read a digit, and a test asserts no digits appear in the response
- Read-only by design. An endpoint that let an operator grant themselves permission to call somebody would defeat the boundary it displays
- `ContactAuthorizationPort` gained `list()`; three test doubles updated
- Verification: lint clean, strict typecheck clean, **410 tests** (275 API + 133 app + 2 tokens), production build, detector zero, deployed and verified live
- Next: Technicians, then Analytics. Analytics must report only measured figures — see the `SLA Compliance (0%)` defect above and do not repeat it

## 2026-08-07 (final) — Technicians and Analytics; every nav route now works

- TECHNICIANS and ANALYTICS SHIPPED. **There are no disabled navigation items left in the app**
- Both were the screens most likely to be padded with invented data, so both are built the other way round. Do not "improve" them later by adding figures
- Technicians derives its roster ENTIRELY from `reportedBy` on incidents that exist. Everyone listed has really done something and every number is a count of rows. Somebody who has not raised an incident does not appear, and the screen states that limitation rather than papering over it with placeholder names
- The rejected alternative was a seeded list of fictional staff with fictional availability and utilisation bars. It would have filled the screen and meant nothing — the same mistake as `SLA Compliance (0%)`
- Analytics returns COUNTS and refuses to compute a rate. No percentage, average or projection appears anywhere in the response, and `insights.spec.ts` **fails if a percent sign ever appears in the payload**. That test is the guard against repeating the defect
- What cannot yet be measured is NAMED alongside what it is waiting on (SLA compliance, automated resolution, time to first contact, dispatch success). A missing metric reads as an oversight; a stated one reads as a boundary
- Simulated calls counted apart from real ones so they can never inflate a figure about real work; a call that connected but produced an unusable answer counted apart from one that returned nothing, because the remedies differ
- Both use cases scan with an explicit bound and return `truncated`, so a count that stopped at a page boundary announces itself rather than quietly under-reporting
- Shared panel styles extracted to `shared-insights.css.ts` rather than duplicated — the two screens are the same construction with different content, and letting them drift would be the first crack in the shape-consistency rule
- Verification: lint clean, strict typecheck clean, **418 tests** (283 API + 133 app + 2 tokens), production build, detector zero, token checker clean, deployed and verified live
- REMAINING BEFORE SUBMISSION: record the demo video (still the single largest scoring gap — a full quarter of the official criteria), architecture diagram, gallery screenshots, the Most Valuable Feedback survey, and the user-only items (CALL-E account email, attestations, video upload, final submit)

## 2026-08-10 — demo video built; live call connects but is SILENT

- DEMO VIDEO BUILT: `assets/demo/fieldrelay-demo.mp4`, **2:30**, 1920x1080 h264 + AAC, Steffan narration locked to picture. 29.7s under the Devpost limit
- Pipeline is three scripts, all committed: `seed-demo-loop.mjs` (populate the loop), `capture-demo-frames.mjs` (13 frames at full resolution via headless Chromium), `build-demo-video.mjs` (assemble against narration)
- Drove the live deployment end to end through the browser: approved `APP-2042-0001` with a note, released it, and `DSP-2042-0001` landed on the Dispatch Board. Analytics then counted the real rows
- TWO FFMPEG TRAPS recorded in the build script: still images fed to the concat demuxer emit ONE frame each and silently ignore the duration on the final entry (150s of narration became a 38s file, no error); and concatenating per-beat segments with `-c copy` drops most of the timeline when timebases disagree. Each frame now gets its own `-loop 1 -t` clip
- Beat 4 is a deliberate 17.8s PLACEHOLDER for phone footage. User declined a generated substitute after it was explained that fabricating the call footage would contradict the project's own thesis in the place a judge looks hardest
- **BLOCKER RAISED — `docs/OPEN_ISSUE_SILENT_CALL.md`.** Live call `CALL-2042-0003` placed 2026-08-10 13:42 UTC to the provisioned target. The phone RANG and was ANSWERED, then **nothing was said** and the call closed itself. Recording confirms it: 27.8s clip, mean volume -30.7 dB, max -10.1 dB — room tone, no speech
- FAULT A, CONFIRMED AND OURS: `CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN` are **not set in Vercel production**. The adapter spreads `webhook_url` conditionally, so with the variable unset **no webhook URL is sent at all** and CALL-E has nowhere to report the terminal event. Every live call therefore stays `queued` forever, no outcome is stored, no approval is raised. This fully explains the stuck status and does NOT explain the silence
- FAULT B, UNDIAGNOSED: the agent said nothing. Prime suspect is `locale: en-IN` having no usable voice — the earlier successful call in `CALL_E_RUNTIME_PROOF.md` is the control case and should be checked for which locale it used. Second suspect is `brief.goal`/`brief.disclosure` resolving empty, producing a `task` of just a newline
- **NOBODY HAS READ THE CALL-E DASHBOARD FOR THIS CALL YET.** That is step one and separates "we sent a bad request" from "their agent failed". Do not place another test call before it
- Calls spent: 4 of a finite allowance reserved for judges
- UPSTREAM PR #107 IS ALIVE: maintainer `@Ray-56` pushed two commits on 2026-08-10 — `23e2261` "chore: merge main into service-dispatch-call" and `6028053` "chore: sync service-dispatch-call with main". A maintainer syncing a contributor branch with main is normally what happens immediately before a merge. No review comments requesting changes
- Remaining before submission: open the upstream PR (user approval), record the golden demo, architecture diagram, gallery screenshots, Dispatch route, and the user-only items (CALL-E account email, attestations, video upload, final submit)

## 2026-08-10 — Codex submission-readiness audit

- Created `codex/submission-readiness-audit`; no push, deployment, production mutation, metered call, or submission action performed
- Upstream community contribution [PR #107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) independently verified **approved and merged**
- Fixed the red GitHub workflow bootstrap: pnpm was pinned in `package.json` and again as a different broad version in `pnpm/action-setup`; the duplicate workflow version is removed
- Upgraded Angular to patched 20.3.27, aligned DevKit overrides, self-hosted Geist Variable/Mono Variable, and removed the production Google Fonts CSP violation; `pnpm audit --prod` now reports no known vulnerabilities
- Tightened call safety: only byte-exact `live` selects the real adapter; live boot requires a token-bound HTTPS webhook; `webhook_url` is always sent; empty speaking tasks fail before resolving a number or contacting CALL-E
- Corrected Mission Control's active incident/call counts to query the full repository using actual domain statuses; replaced the queued-call claim that nothing had dialed; removed nested `main` landmarks
- Fixed demo frame capture to select Approved and made the final video builder require genuine handset footage; placeholder builds require `--draft` and receive a DRAFT filename
- Full local verification: **438 tests** with PostgreSQL (303 API + 133 app + 2 tokens), ESLint, strict typecheck, production build, token checker, impeccable detector zero, dependency audit clean, full-history Gitleaks clean
- Judge Docker images rebuilt; `/health` and `/` return 200. Local 390x844 route audit and read-only live route/deep-link audit completed
- Remaining: user approval to push/deploy; production webhook values; refreshed CALL-E authorization/provider inspection; genuine final video; gallery/architecture assets; license and Devpost human actions
- Operational continuation: branch pushed and draft PR #1 opened; encrypted sensitive production webhook URL/token configured without printing or persisting the generated token
- First PR CI progressed past the former pnpm bootstrap failure and exposed a Linux-only Vitest spy type declaration; fixed by asserting against the typed `Router.navigate` member. Local app typecheck and all 133 app tests pass
- CALL-E browser authorization was received, but the broker exchange returned HTTP 502 twice. No call was placed; provider inspection remains blocked until the broker recovers
- Replacement PR CI is green. Added and visually verified `assets/fieldrelay-architecture.svg` plus a 1600x900 PNG submission asset showing the actual runtime and refusal boundaries
- PR #1 merged to `main` as `96034ff`; Vercel production deployment `dpl_h1CDw1vokp2GeTv5LDhyV1DUwqKP` is READY and aliased to the public URL
- Live verification: health 200, anonymous incidents 401, all nine signed-in routes 200 with one main/H1/no overflow/self-hosted Geist, zero console warnings/errors, and every observed API request 200
- Five production gallery screenshots visually inspected and promoted to `assets/gallery/`: Mission Control, structured call outcome, human approval, dispatch, and vendor authorization boundaries
- Final `main` CI run 31403892709 passed for `f51613c`
- Refreshed CALL-E broker authorization succeeded. Read-only production lookup recovered the REST provider id; authenticated `get_call_run` returned `run_id not found` because the official MCP surface accepts only MCP run ids and exposes no REST-call lookup. No call was placed and no private call data was printed or persisted
- Silent-call diagnosis is now externally blocked on CALL-E support/read-only REST-call lookup; added this concrete interoperability gap to the feedback-prize draft
- Removed the post-green CI deprecation warning by upgrading the official action majors to `actions/checkout@v7`, `actions/setup-node@v7`, and `pnpm/action-setup@v6`; exact package-manager version remains owned solely by `packageManager`

## 2026-08-16 — post-submission live-call readiness recheck

- Production health and published demo sign-in return 200. Authenticated read-only checks confirm `mode: live`, one configured/callable authorized contact, runtime target changes enabled, and the token-protected webhook route rejects an unsigned request with 401.
- The official CALL-E CLI token is usable and the authenticated tool catalogue exposes `plan_call`, `run_call`, and `get_call_run`.
- Re-ran the full local gate without placing a phone call: 303 API tests against the remote PostgreSQL database, 133 app tests, 2 token tests, ESLint, strict typecheck, production build, and impeccable detector zero all pass.
- This did **not** close the live-call blocker at the time. Historical proof recorded one successful
  live structured result, while production call `CALL-2042-0003` remained `queued`; the phone rang
  and then appeared silent. The queued state was reconciled on 2026-09-02, and provider inspection
  showed delayed first speech rather than an empty task; the provider-latency fault remains unresolved.
- Result: the judge-facing application and integration boundary are verified; a fresh end-to-end live call is **not** verified and must not be promised. No new metered call was placed.

## 2026-09-03 — official-name correction and CALL-E request receipt

- Recorded the user's official identity as **Atchayam G**; `G` is the complete last name/surname and must never be expanded to `Ganesh`.
- Corrected repository-owned participant and mockup references to `Atchayam G`.
- Verified the Gmail receipt for the CALL-E Additional Calls Request Form. Google Forms confirms the request was received, but the submitted Last Name field is `Ganesh`; the receipt offers no edit-response link. A corrected resubmission is pending explicit user approval.

## 2026-09-03 — blank-screen recovery and judge call-launch path

- Confirmed production health, HTML, hashed JavaScript and CSS assets, and evaluator sign-in in a fresh in-app browser session. The reported all-white page is isolated to the external browser context, not a failed deployment.
- Added a static Cobalt Ops loading/recovery surface so JavaScript delay or bootstrap failure can no longer appear as an unexplained blank white document.
- Added the missing guarded call-start UI to an incident's Latest Call tab. It displays live versus simulated mode, only the masked provisioned target, and the authorized contact; requires preparation plus explicit acknowledgement; fixes the purpose and retry policy; and preserves one idempotency key for the submission.
- The page blocks a new launch while a task is queued, in flight, failed, unanswered, or outcome-unknown. A completed task remains reviewable and can be followed by a separately prepared and confirmed new task. Provider ambiguity triggers a durable-record refresh and no redial instruction.
- CALL-E Support logged the approximately 23-second first-speech delay as public issue #295. The issue is open at P2 and needs investigation; the provider cannot promise a mitigation before judging.
- Local verification: 139/139 app tests, strict typecheck, production build, focused ESLint, token checker (66 defined / 57 referenced), and impeccable detector zero. No call was placed.
- Commits `01b154b` and `e3b1d88` were pushed to `main`; full database-backed CI runs `33728646497` and `33729216711` passed.
- Vercel deployment `dpl_Hd7kg9LgpBYX5GqrFyiJQHmzooPn` is Ready and the public alias serves its hashed final bundle plus loading fallback. Fresh in-app sign-out/sign-in, Mission Control data, and the disabled-until-acknowledged live-call confirmation were visually verified with zero console warnings/errors. No call or credit was consumed.
