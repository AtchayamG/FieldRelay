# Test Report

## 2026-07-25 — Live CALL-E integration

Environment: Node 24.18.0 LTS, pnpm 10.34.4, Windows. No local PostgreSQL running.

| Check | Result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS — strict, all five projects |
| `pnpm test` | PASS — 198 tests: API 144, app 52, tokens 2; 15 PostgreSQL-dependent tests skipped |
| `pnpm build` | PASS — the Node engine warning is gone; the 1.23 MB initial chunk warning remains |

New coverage proves that the live adapter sends bearer auth, a per-task idempotency key, the brief, the recipient and the closed result schema; that the incident UUID is never transmitted; that a rejected request neither echoes the provider's message nor leaks the dialled number; that transport failures, missing call identifiers and oversized responses become provider errors rather than silent successes; that an unknown provider status degrades to `queued` instead of a fabricated terminal state; that live mode refuses to boot without valid configuration and that every non-`live` mode value selects the demo adapter; that malformed dial-target entries fail at boot; and that the CALL-E webhook rejects missing and wrong tokens, applies a terminal delivery exactly once, recognises a repeat delivery as a replay, absorbs non-actionable lifecycle noise, and discards transcripts, recordings and structured results.

Still not covered: a real authorized CALL-E call, structured-outcome ingestion, production authentication and RBAC on the rest of the API, automated accessibility scanning, image-diff regression, offline PWA behaviour, and Capacitor native builds.

## 2026-07-24 — Backend and frontend foundations

Environment: Node 22.9.0, pnpm 10.34.4, Windows.

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 8 suites, 32 tests |
| `pnpm build` | PASS — Node patch and chunk-size warnings recorded |
| `pnpm audit` | PASS — no known vulnerabilities |
| clean-state test without generated `dist` | PASS |

Backend coverage proves input bounds, required idempotency key propagation, contact authorization, allowed-purpose enforcement, provider non-invocation on rejected calls, and explicit demo/simulated labeling.

Frontend coverage proves theme persistence, demo authentication/session clearing, rejection of non-demo credentials, Mission Control rendering, system-state changes, approval decisions, and design-token integrity. Production-preview browser checks covered desktop and 430 px mobile layouts, dark/light themes, sign-in/sign-out, approval action, state switching, scrolling, horizontal overflow, and console errors.

Not yet covered: persistence-backed idempotency, production CALL-E adapter, production authentication/RBAC, API E2E, automated browser E2E, image-diff regression, offline PWA behavior, accessibility automation, and Capacitor native builds.

Known warnings:

- Local Node 22.9 is below Vite 7's supported 22.x patch floor; repository engines require Node >=22.12.
- Initial minified frontend chunk is 1.21 MB (292 KB gzip).

## 2026-07-24 — Incident UI and durable call tasks

Environment: Node 22.9.0, pnpm 10.34.4, PostgreSQL 17, Windows.

| Check | Result |
|---|---|
| `pnpm install --force --frozen-lockfile` | PASS — restored the locked Windows native optional binding |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` with PostgreSQL | PASS — 121 tests total: API 85, app 34, tokens 2 |
| `pnpm build` | PASS — Node patch and 1.23 MB initial-chunk warnings remain |
| `pnpm audit --prod` | PASS — no known vulnerabilities |
| fresh Compose initialization | PASS — `0001_incidents`, `0002_call_tasks`, 3 deterministic seed incidents |
| Playwright runtime flow | PASS — create, detail, list, search, status-filter empty state, light/dark, 430 px mobile |

Call safety coverage now proves the queued task and idempotency reservation commit before provider I/O, success is persisted and replayable, mismatches/in-progress duplicates do not create another task, ambiguous failure persists `outcome_unknown` without enabling redial, and PostgreSQL enforces the incident foreign key.

Still not covered: production CALL-E adapter/callbacks, production authentication/RBAC, automated accessibility scanning, image-diff regression, offline PWA behavior, and Capacitor native builds.

## 2026-07-24 — Simulated call operations UI

Environment: Node 22.9.0, pnpm 10.34.4, PostgreSQL 17, Windows.

| Check | Result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` with PostgreSQL | PASS — 139 tests total: API 85, app 52, tokens 2 |
| `pnpm build` | PASS — Node patch and 1.23 MB initial-chunk warnings remain |
| `pnpm audit --prod` | PASS — no known vulnerabilities |
| Playwright runtime flow | PASS — API-backed queue/detail, status empty state, invalid UUID validation, light/dark, desktop and 430 px mobile |
| Runtime network/console | PASS — list/detail GET requests `200`; zero errors and zero warnings |

Call UI coverage proves bounded query mapping, status/incident filters, replacement-request stale-data clearing, pagination retry behavior, simulated/non-simulated disclosure, `outcome_unknown` no-redial guidance, and detail error/permission states. Browser checks confirmed no page-level horizontal overflow and no controls that can start, retry, or redial a call.
