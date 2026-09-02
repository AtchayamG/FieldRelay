# 2026-09-02 production and CALL-E recheck

## Result

FieldRelay's deployed application and configuration remain healthy, but a new successful live call
cannot yet be guaranteed. Authenticated CALL-E records narrow the August 10 failure to approximately
23 seconds of provider voice-start latency before the bot spoke the correct FieldRelay prompt.

## Evidence checked

- Today's CALL-E monthly-usage email: one August call, IN, 45 seconds, USD 0.05.
- Authenticated CALL-E Billing and Call records pages in the Codex in-app browser.
- Read-only conversation-detail timeline; no playback, download, sharing, or new call action.
- Authenticated production FieldRelay session and all top-level routes.
- Vercel production inspection and GitHub Actions history for `main`.
- Current official CALL-E API documentation and integration repository.

## Findings

- The provider record ended `ByRobot` after 45 seconds.
- Recipient-line activity appears before the first bot turn.
- The first bot turn starts around 23 seconds and contains the expected maintenance-reference task.
- The public create-call contract contains no greeting-delay or voice-start tuning field.
- Production is Ready; demo sign-in and every top-level application route load without an
  application-error state; the live adapter and masked authorized `IN · en-IN` target are configured.
- Latest `main` CI at `4ead8ab` passes.

## Local verification

- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm build`: pass; the known large frontend-chunk warning remains.
- `node scripts/check-tokens.mjs`: pass, 66 defined / 57 referenced / all resolve.
- `npx impeccable detect apps/fieldrelay-app/src --no-config`: exit 0.
- `pnpm test` without `DATABASE_URL`: pass, 430 tests (293 API + 135 app + 2 design tokens), with
  the 15 PostgreSQL integration tests skipped.
- `pnpm audit --prod`: no known production dependency vulnerabilities.
- High-confidence credential-pattern scan: no candidate committed or untracked credential file;
  numeric-pattern file review found only fictional fixtures, UUIDs, documented timestamps, and the
  infrastructure resolver that reads the server-side allowlist.
- `vercel build --prod`: pass; generated a deployable `.vercel/output` without publishing it. The
  root Node engine is pinned to Vercel's supported `24.x`, matching CI, rather than an open-ended
  range that could silently select a future major runtime.
- A database-backed attempt used the repository's local `DATABASE_URL` but failed only because Docker
  Desktop's PostgreSQL engine was stopped (`ECONNREFUSED 127.0.0.1:5432`). The last full
  database-backed 438-test gate passed on 2026-08-16; no application code changed in this recheck.

## Safety and privacy

No call was planned or placed. No raw phone number, verbatim transcript, recording, credential, or
provider payload was persisted. Only timing, billing, hang-up classification, and sanitized behavior
were recorded.

## Production release and reconciliation

- User approved deployment with exact live mode retained.
- Local-prebuilt deployment `dpl_4GnFu2tRtvPkG6hZgZ6GJgma8Sv1` was marked Ready but its serverless
  bundle omitted `@nestjs/core`. The custom alias returned 500, so production was immediately rolled
  back to `dpl_h1CDw1vokp2GeTv5LDhyV1DUwqKP`; health returned 200.
- A clean remote build produced `dpl_6cUXecjxzyhRHYw7LnnQqsXSS1cy`; its traced serverless function is
  healthy and the custom alias now points to it.
- The authenticated reconciliation endpoint returned `{ status: "completed", applied: true }` for
  `CALL-2042-0003`. Readback confirms a non-simulated completed call with bounded outcome,
  `taskCompleted: false`, high confidence, and no validation failure.
- In-app browser verification confirms the same visible state, live adapter, masked configured target,
  and no console errors. No phone call was placed.

## Known limitation and exact next task

Ask CALL-E support to inspect the persisted REST call identifier already recorded in
`docs/OPEN_ISSUE_SILENT_CALL.md`, explain the roughly 23-second first-audio delay, and provide a
documented mitigation. Do not spend another metered call until that read-only diagnosis arrives.

## Lost-webhook recovery implemented

The provider lookup proved that FieldRelay can safely reconcile an existing call without another
phone side effect. A new application read port and use case now:

- accept only a persisted FieldRelay call-task UUID;
- refuse simulated, provider-id-less, and already-terminal tasks;
- issue only CALL-E `GET /v1/calls/{id}`;
- require the response id to match the persisted provider id;
- discard phone numbers, transcripts, summaries, evidence, and recordings;
- apply only the normalized terminal status and schema-shaped outcome through the existing
  idempotent callback transaction; and
- expose the action on call detail as “Check provider status,” never retry or redial.

Focused verification after implementation: 293 API tests, 135 app tests, API/app strict typecheck,
workspace lint, production build, token resolution, and impeccable detector all pass. Deployment was
not performed because it requires explicit user approval.
