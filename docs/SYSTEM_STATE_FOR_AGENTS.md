# System State for Agents

**Updated:** 2026-08-10. Read this after `docs/00_MASTER_BLUEPRINT.md` and `AGENTS.md`. This is current implementation truth; planned mockups are not evidence.

## Current product

FieldRelay is a working property-maintenance operations console. An operator can create and triage incidents, place an authorized CALL-E call, validate its structured answer, stop for human approval when the answer creates risk or cost, release an approved dispatch, and inspect vendors, technicians, analytics, settings, and audit activity. Every navigation route is implemented; none is a disabled promise.

The public deployment is `https://fieldrelay-pi.vercel.app`. It is still on the pre-audit build until the user approves a deployment. Do not infer production state from local fixtures.

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

## Open production issue

Call `CALL-2042-0003` rang and was answered but produced silence. Four metered calls have been spent. Do not place another call until the provider record is inspected. The CALL-E CLI currently needs the user to complete refreshed authorization.

Production received encrypted sensitive `CALLE_WEBHOOK_URL` and `CALLE_WEBHOOK_TOKEN` values on 2026-08-10. The audited code still must be deployed before this closes the callback gap. See `docs/OPEN_ISSUE_SILENT_CALL.md`.

## Submission state

- Upstream community contribution [CALLE-AI/awesome-phone-call-agents#107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) is approved and merged.
- The local 2:30 video is a **draft still-image cut**. Its phone segment is a placeholder and its old Approvals frame misses the human gate. `scripts/build-demo-video.mjs` now refuses to create the final filename without genuine `assets/demo/phone-call.mp4`; `--draft` is explicit.
- The repository is public but has no license. License selection is a user/legal decision.
- Draft PR #1 is open and its replacement CI run passes. The first run exposed a Linux-only Vitest spy typing error; the focused correction also passes local app typecheck and all 133 app tests.

## UI contract

Read `docs/DESIGN_SYSTEM.md` before any UI edit. Geist Variable and Geist Mono Variable are self-hosted. `--fr-color-signal` is for live state, nested panels use `--fr-tray-radius-inner`, side-tab borders are banned, and motion uses only `--fr-ease` with transform/opacity.

## Required handoff

Report result, files changed, decisions, commands/tests, limitations, cleanup, risks, and the exact next task. Update this file, `docs/taskstatus.md`, `docs/handover.md`, `docs/DESIGN_SYSTEM.md` when relevant, and add a substantial run record under `docs/agent-runs/`.
