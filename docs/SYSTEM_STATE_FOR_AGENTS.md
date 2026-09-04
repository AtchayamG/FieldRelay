# System State for Agents

**Updated:** 2026-09-03. Read this after `docs/00_MASTER_BLUEPRINT.md` and `AGENTS.md`. This is current implementation truth; planned mockups are not evidence.

## Current product

FieldRelay is a working property-maintenance operations console. An operator can create and triage incidents, place an authorized CALL-E call, validate its structured answer, stop for human approval when the answer creates risk or cost, release an approved dispatch, and inspect vendors, technicians, analytics, settings, and audit activity. Every navigation route is implemented; none is a disabled promise.

The public deployment is `https://fieldrelay-pi.vercel.app`. Release `1e50946` is served by Vercel
deployment `dpl_CpbMihM42QgSMSXeNs75xKcYfabD` and was verified live on 2026-09-03. Do not infer
later production state from local fixtures.

September 3 judge-call release: commits `01b154b` and `e3b1d88` passed full database-backed CI runs
`33728646497` and `33729216711`. Vercel deployment `dpl_Hd7kg9LgpBYX5GqrFyiJQHmzooPn` is Ready and
aliased to the public URL. Fresh in-app sign-out/sign-in returned to Mission Control, live data loaded
with zero console warnings/errors, and incident `INC-2042-0001` reached the final live-call
confirmation with an unchecked acknowledgement and disabled submit button. No call was placed.

September 3 live evidence run: after explicit action-time confirmation, the production UI created
exactly one new live task, `CALL-2042-0004`. The phone answered and CALL-E delivered the disclosure,
asked for vendor availability, ETA, and rough cost, and received a bounded answer. The callback
stored available `yes`, `$40`, ETA `1440` minutes, and confidence `0.9`. The record initially still
showed `queued` despite its structured outcome; the existing read-only provider-status control
reconciled that same task to `completed` and version 3 without redialling. Production therefore has
a fresh end-to-end live proof. Provider startup latency is still an external risk, not an open
FieldRelay correctness gap.

The incident detail `Latest Call` tab now exposes the existing start-call contract through a guarded
operator flow. It reads the deployment mode plus masked target, binds the request to the incident,
the configured authorized contact, and `vendor_availability`, fixes retries at zero, generates one
browser idempotency key per confirmation, and requires a second explicit acknowledgement. A live
failure refreshes the durable call record and never invites a new-key retry. No phone number is
accepted from or returned to this screen.
An existing queued, ringing, connected, failed, no-answer, or unknown-outcome task suppresses a new
launch. A completed task remains visible and may be followed by a deliberately new task through the
same two-step confirmation; this is not a retry and receives a new idempotency key.

The static application document includes a dark FieldRelay loading surface before Angular starts.
If bootstrap fails it changes to a recovery message, so a stale or incompatible browser no longer
shows an unexplained white document. A fresh in-app production session already proved that the
deployed application and evaluator sign-in were healthy; the reported white external-browser tab
was isolated to that browser context.

## Verified baseline

- **438 tests:** API 303, app 133, design tokens 2. The API count includes PostgreSQL integration tests run with `DATABASE_URL` set.
- ESLint clean; strict TypeScript clean; production build passes.
- `npx impeccable detect apps/fieldrelay-app/src --no-config`: zero findings.
- Token checker: 66 defined, 57 referenced, all resolve.
- `pnpm audit --prod`: zero known vulnerabilities.
- Gitleaks: 70 commits / 5.45 MB scanned, no leaks. `.gitleaksignore` contains only two exact historical test-fixture fingerprints.
- Judge Docker build passes; `http://localhost:8080/health` and `/` return 200.
- Local browser audit at 390x844 covered all nine top-level app routes: no horizontal overflow, one main landmark, headings present, no console errors.
- Live read-only audit covered all routes and deep links with no failed requests. It also found the production-only gaps fixed on this branch: stale Mission Control counts, nested main landmarks, misleading queued-call copy, and Google Fonts blocked by CSP.

Run:

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter fieldrelay-api db:migrate
# Set DATABASE_URL before tests; otherwise PostgreSQL tests skip.
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-tokens.mjs
npx impeccable detect apps/fieldrelay-app/src --no-config
pnpm audit --prod
gitleaks git --redact --no-banner --verbose
docker compose -f docker-compose.judge.yml up -d --build
```

## Implemented routes and persistence

- Routes: sign-in; Mission Control; incident list/create/detail; call queue/detail; approvals; dispatch; vendors; technicians; analytics; settings.
- PostgreSQL migrations `0001` through `0008`; in-memory unit of work exists for isolated tests only.
- Mission Control uses repository count queries across the complete data set and actual domain statuses. Do not replace these with the latest page length.
- Technicians and Analytics intentionally report only measured counts. Never render a zero or rate without a denominator.

## CALL-E boundary

- `DemoCallEAdapter` never dials and reports `simulated: true`. `CalleApiAdapter` performs `POST /v1/calls`.
- Only the exact value `live` in `CALL_E_MODE` enables dialing. Case changes and whitespace select demo mode.
- Live boot now requires a valid HTTPS `CALLE_WEBHOOK_URL`, a `CALLE_WEBHOOK_TOKEN` of at least 24 characters, and an exact token match in the URL query. The adapter always sends `webhook_url`.
- The composed CALL-E speaking task must contain a disclosure or goal. It is rejected before a dial target is resolved if empty.
- The request uses `recipients: [{ phones: [...] }]`; the terminal webhook call id is `data.id`, not the envelope event id.
- Provider schemas contain only CALL-E-supported keywords. FieldRelay enforces stricter bounds locally.
- A raw phone number may exist only in `CALLE_DIAL_TARGETS` or the infrastructure-owned `runtime_settings` row. It is never logged, returned, audited, or committed.
- The call task and idempotency reservation commit before provider I/O. The task UUID is the provider idempotency key and is reused across retries.
- Ambiguous outcomes become `outcome_unknown` and are never auto-redialed.
- Transcripts, recordings, provider payloads, and undeclared answer fields are discarded at the ingestion boundary.
- Adapter selection now checks the exact live-mode gate before constructing the dial-target resolver. Demo selection therefore cannot fail because unrelated process-level live variables exist; live selection resolves targets only from the `env` object supplied to it.
- A session-protected `POST /api/v1/calls/:callTaskId/reconcile` route repairs a delayed or lost
  terminal webhook by issuing only `GET /v1/calls/{providerTaskId}`. It refuses simulated tasks,
  tasks without a provider id, and already-terminal tasks. The lookup validates the returned call id,
  discards phone numbers, transcripts, summaries and evidence, and feeds only status plus the bounded
  structured outcome through the existing replay-safe callback transaction. It has no call-start or
  retry capability and therefore cannot redial.

## Open production issue

Call `CALL-2042-0003` rang and was answered but appeared silent to the recipient. Authenticated CALL-E
inspection on 2026-09-02 shows the voice runtime eventually spoke the correct FieldRelay prompt, but
its first bot turn did not begin until about 23 seconds into a 45-second billed call. This rules out an
empty task; the unresolved problem is provider voice-start latency. The public create-call contract
documents no greeting-delay control. Do not place another call until CALL-E explains or mitigates it.
The MCP server still accepts only MCP `run_id`s; the persisted REST `call_id` returns `run_id not found`.

CALL-E Support replied on 2026-09-03 and logged the first-speech delay as public GitHub issue #295,
labelled `area:voice-speech`, `priority:p2`, and `status:needs-investigation`. They said recent attacks
may be related but have not confirmed the cause, and they cannot promise a mitigation before judging.
Treat this as an open provider risk. One evidence call may be made only after the user is ready and
confirms at the moment of dial; inspect that result before considering any second call.

Production received encrypted sensitive `CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN` values and the hardened adapter was deployed on 2026-08-10. New calls carry the callback URL. The read-only reconciliation action was deployed on 2026-09-02 and applied once to historical `CALL-2042-0003`; it now shows the provider-reported `completed` call status while honestly preserving `taskCompleted: false`. See `docs/OPEN_ISSUE_SILENT_CALL.md`.

Post-submission recheck on 2026-08-16 confirmed the public health route, demo sign-in, live mode,
configured/callable target, runtime target control, and token rejection on the webhook boundary.
The official CALL-E CLI authentication and required MCP tools are also usable. These checks prove
readiness and wiring, not a successful new phone conversation. The silent-audio fault is still open;
do not collapse “historical live proof” into “current end-to-end call verified.”

September 2 production recheck: the authenticated deployment opened successfully; Mission Control
and all eight other top-level routes loaded without application-error states; exact live mode, the
masked authorized target, region `IN`, locale `en-IN`, and runtime target control are visible. Vercel
reports the production deployment Ready and the latest five `main` CI runs are green. These checks do
not remove the provider startup-latency risk.

September 2 release: remote-built deployment `dpl_6cUXecjxzyhRHYw7LnnQqsXSS1cy` is Ready and the
custom production alias points to it. A local-prebuilt attempt omitted serverless dependencies and
was immediately rolled back before the remote rebuild; `/health` returned 200 after rollback and
again after the corrected deployment. In-app verification confirmed the live adapter, masked
configured target, reconciled call detail, and zero browser-console errors.

September 2 final sync check: the public auth API returns 200 for the published evaluator
credentials, and the in-app browser successfully reached Mission Control from `/auth/sign-in`. A cold
serverless start can leave the sign-in button showing `Verifying Session...` for several seconds
before redirect; do not treat that alone as a failed login unless the page surfaces an error or the
request fails. September 3 closeout repeated this check against deployment
`dpl_CpbMihM42QgSMSXeNs75xKcYfabD`: in-app sign-in reached Mission Control, the call queue loaded,
all principal authenticated APIs returned 200, the masked live target remained configured, and
non-simulated `CALL-2042-0003` remained completed. GitHub Actions run `33678645033` passed the full
database-backed gate and production audit. No metered call was placed.

## Submission state

## 2026-09-04 — Devpost build-session calibration

- Reviewed the Devpost email “Build Session Recordings - Agentic Cinema: The Blockbuster Hackathon” and its five public partner recordings (Replit, Parallel, Grafana, ClickHouse, and IBM). These are workshop recordings for a different hackathon, not FieldRelay evidence or judging results.
- The Replit session's presentation guidance is directly useful: communicate the product's job within the first few seconds; provide a clear marketing “front door” before dropping viewers into functionality; show the core path working and deployed; make copy specific to the user problem; and use only as much AI as the product needs instead of relying on a generic “AI-powered” label.
- FieldRelay's public video already follows the applicable parts of this guidance: it opens with the operational problem and governed-call promise, uses the authentic deployed application for the working flow, labels simulated versus historical-live evidence, and ends with architecture/guardrails. No product or public-submission change is justified solely by these unrelated workshops.

- September 4 publication closeout: user-approved replacement video is public at
  `https://youtu.be/34Jy7yKM_Ds`, with the current thumbnail and English captions. YouTube's
  publication dialog and public player's English caption track were verified. Devpost submission
  `1140281` remains submitted and its public iframe now embeds `34Jy7yKM_Ds`. This supersedes
  the older video URL below. No application configuration or call state changed during publishing.

- Upstream community contribution [CALLE-AI/awesome-phone-call-agents#107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) is approved and merged.
- `assets/demo/fieldrelay-demo.mp4` is the verified 2:59.861 detailed landscape walkthrough. Its warm editorial presentation canvas surrounds full-content views of the authentic dark application. Dense screens and the architecture diagram are contained without zoom or pan; sparse screens trim only unused bottom space. It explains the complete idea and working product with deployed-app footage, real approval/dispatch/vendor/analytics screens, the archived verified live CALL-E structured result, architecture evidence, and explicit simulated/historical-live labels. `assets/demo/fieldrelay-thumbnail.png` is the matching 1280×720 thumbnail built from real product screens. No new call was placed. The older `fieldrelay-demo-DRAFT.mp4` and its builder remain historical draft artifacts.
- The public YouTube release is `https://youtu.be/tq6L4HOqRXQ`. FieldRelay is submitted to `CALL-E: Your Code Is Calling` as submission `1140281`; the verified public project is `https://devpost.com/software/fieldrelay`.
- The repository is public but has no license. License selection is a user/legal decision.
- PR #1 is merged; its replacement CI and post-gallery `main` run 31403892709 pass. The first run exposed a Linux-only Vitest spy typing error; the focused correction also passes local app typecheck and all 133 app tests.
- CI uses the current Node 24-based action majors (`checkout@v7`, `setup-node@v7`, `pnpm/action-setup@v6`); do not reintroduce Node 20 action runtimes that GitHub must compatibility-force.

## UI contract

Read `docs/DESIGN_SYSTEM.md` before any UI edit. Geist Variable and Geist Mono Variable are self-hosted. `--fr-color-signal` is for live state, nested panels use `--fr-tray-radius-inner`, side-tab borders are banned, and motion uses only `--fr-ease` with transform/opacity.

Desktop feature content starts at the shell gutter rather than centering itself inside the shell canvas. Call queue and call detail use the same 1400px cap; call detail is left-anchored. This prevents a false 300px gap beside the sidebar at 1920px.

## Required handoff

Report result, files changed, decisions, commands/tests, limitations, cleanup, risks, and the exact next task. Update this file, `docs/taskstatus.md`, `docs/handover.md`, `docs/DESIGN_SYSTEM.md` when relevant, and add a substantial run record under `docs/agent-runs/`.
