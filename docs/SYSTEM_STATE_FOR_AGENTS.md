# System State for Agents

**Updated:** 2026-09-02. Read this after `docs/00_MASTER_BLUEPRINT.md` and `AGENTS.md`. This is current implementation truth; planned mockups are not evidence.

## Current product

FieldRelay is a working property-maintenance operations console. An operator can create and triage incidents, place an authorized CALL-E call, validate its structured answer, stop for human approval when the answer creates risk or cost, release an approved dispatch, and inspect vendors, technicians, analytics, settings, and audit activity. Every navigation route is implemented; none is a disabled promise.

The public deployment is `https://fieldrelay-pi.vercel.app`. Merge `96034ff` was deployed on 2026-08-10 and verified live. Do not infer later production state from local fixtures.

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

## Submission state

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
