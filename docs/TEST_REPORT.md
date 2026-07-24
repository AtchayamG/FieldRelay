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
