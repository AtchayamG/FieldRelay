# Test Report

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
