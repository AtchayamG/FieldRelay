# Codex run — submission-readiness audit

**Date:** 2026-08-10  
**Branch:** `codex/submission-readiness-audit`  
**Scope:** repository, CI history, live read-only judge experience, CALL-E configuration, security/dependencies, demo evidence, and submission documents.

## Result

FieldRelay is merged, CI-green, deployed, and live-verified. Final phone evidence, provider inspection, and human/legal submission actions remain.

## Findings and decisions

1. GitHub Actions was red before dependency installation because pnpm was specified as `10` in the action and `10.34.4` in `package.json`. Keep the exact package-manager pin as the sole authority.
2. Angular 20.3.26 matched two published security advisories. Upgrade runtime, compiler, build tooling, and DevKit overrides together to 20.3.27.
3. Production CSP blocked Google Fonts on every route. Self-host the variable fonts rather than weaken CSP.
4. Mission Control counted a recent page and used stale status names, under-reporting active incidents. Add repository count operations and use the domain's current statuses.
5. A queued provider request does not prove a phone never rang. Use non-inferential copy until a later provider event is received.
6. The production environment lacks CALL-E webhook settings. Make live configuration fail closed; do not silently create calls that can never complete locally.
7. The video file was technically valid but evidentially weak: a slideshow, placeholder handset segment, and an empty Pending approvals frame mislabeled Approved. Rename it `fieldrelay-demo-DRAFT.mp4`, gate the final filename on real footage, and fix the capture flow.
8. The public repo has no license. Do not choose one on the user's behalf.

## Files changed

- CI/config/dependencies: `.github/workflows/ci.yml`, `.env.example`, root/app/API package manifests and `pnpm-lock.yaml`, `.gitleaksignore`.
- CALL-E/API: live selection, adapter configuration/prompt validation, mission-control counts, repository ports/implementations, and tests.
- UI: self-hosted fonts, call landmarks/copy, Mission Control mapping/count labels, approval test routing, design tokens.
- Demo: `scripts/capture-demo-frames.mjs`, `scripts/build-demo-video.mjs`.
- Documentation: README, system state, handover, design contract, silent-call issue, Devpost readiness/draft, task status, and handoff prompt.

Use `git diff --stat` for the authoritative file list.

## Verification

- `node .tmp/run-with-local-db.mjs pnpm.cmd test` — 438 passed: 303 API, 133 app, 2 tokens; PostgreSQL suites included.
- `pnpm exec eslint .` — clean.
- `pnpm typecheck` — clean.
- `pnpm build` — pass; known 1,247 KB minified / 304 KB gzip framework entry warning.
- `node scripts/check-tokens.mjs` — 66 defined, 57 referenced, all resolve.
- `npx impeccable detect apps/fieldrelay-app/src --no-config` — zero.
- `pnpm audit --prod` — no known vulnerabilities.
- `gitleaks git --redact --no-banner --verbose` — 70 commits, 5.45 MB, no leaks.
- `docker compose -f docker-compose.judge.yml build` — pass.
- Judge smoke: `/health` 200 with `{ "status": "ok" }`; `/` 200.
- Local Playwright at 390x844: all nine top-level app routes have an H1, no horizontal overflow, one main landmark, and no console errors.
- Live read-only Playwright: all routes/deep links 200 with no failed requests; findings above reproduced before local fixes.
- `node scripts/build-demo-video.mjs` without handset footage — expected fail-closed result.
- Post-push CI run 31404445843 — pass; its only annotation identified Node 20 action runtimes, subsequently upgraded to the official Node 24 majors.

## Known limitations and risks

- Draft PR #1 is published and replacement CI is green. Its first run found a Linux-only Vitest spy type declaration; the focused correction passes local app typecheck and all 133 app tests.
- Architecture submission assets (`assets/fieldrelay-architecture.svg` and `.png`) were rendered at 1600×900 and visually inspected; the first blank file-URL capture was rejected and recaptured over loopback.
- PR #1 merged as `96034ff`; production deployment `dpl_h1CDw1vokp2GeTv5LDhyV1DUwqKP` is READY and aliased to the public URL.
- Live verification: health 200, anonymous data 401, all nine authenticated routes 200, correct headings/landmarks/no overflow/self-hosted font, zero console messages, observed APIs 200.
- Five production gallery images were visually inspected and saved under `assets/gallery/`.
- The initial framework chunk remains large, although feature screens are lazy-loaded.
- Refreshed CALL-E authorization succeeds. Production persisted a REST `call_id`, but the authenticated MCP server exposes only `get_call_run(run_id)` and returns `run_id not found`; provider inspection is externally blocked on CALL-E support/tooling. Four calls are already spent; no new call was placed.
- The current 2:30 demo is a draft and must not be uploaded as final evidence.
- The official Devpost overview/rules disagree on AM/PM; operate to 2026-09-14 11:45 AM SGT.
- Public demo credentials plus live mode create budget/recipient risk. Prefer demo mode except during supervised judging.

## Cleanup

Disposable browser/contact-sheet outputs remain under ignored `.tmp/`/Playwright paths. Local API/Vite audit processes must be stopped at handoff. Judge Docker services may remain available for the user unless explicitly cleaned up.

## Exact next task

Escalate the REST call id to CALL-E for read-only inspection or request a CLI/MCP lookup that accepts REST call ids. Do not consider a final supervised call until the provider record identifies a concrete correction.
