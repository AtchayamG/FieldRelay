# Handover

**Updated:** 2026-09-02 on local `main` at release commit `423d60e`, one commit ahead of `origin/main`, plus this documentation audit.

## Result

The application is functionally release-ready locally. The full 438-test database-backed gate,
lint, strict typecheck, production build, token checker and impeccable detector pass. A redesigned
2:59.861 Devpost walkthrough, SRT captions, and 1280×720 thumbnail exist under `assets/demo/`.
The approved video is public at `https://youtu.be/tq6L4HOqRXQ`, and the connected Devpost account
is registered for `CALL-E: Your Code Is Calling` with the user's confirmed rules and eligibility.
Devpost submission `1140281` is verified live at `https://devpost.com/software/fieldrelay`.
The required CALL-E contribution PR #107 is independently verified `APPROVED` and `MERGED`.

## Changes in this slice

- Call detail starts at the normal 48px shell gutter rather than leaving a large desktop dead zone.
- Demo adapter selection returns before constructing live dial infrastructure; the exact
  `CALL_E_MODE === 'live'` boundary remains unchanged.
- Remote PostgreSQL integration tests allow pooled TLS startup time without weakening assertions.
- The final film now explains the product idea and navigates the working application in detail.
- Visual QA replaced an empty approval queue with the real approved quote, confidence, decision,
  and release control.
- Presentation slides use a warm editorial canvas while application screens remain dark.
  Full-content framing preserves sidebars, controls, cards, metrics, and the complete architecture
  diagram; sparse pages trim only unused bottom workspace.
- A matching thumbnail uses real call-outcome and approval screens in a Sahaaya-informed composition.
- Simulated evaluator behavior, live-mode behavior, and historical verified live evidence remain
  explicitly distinct. No new phone call was placed.
- The deployed lost-webhook recovery slice lets an operator check an existing non-terminal live call's
  provider status without redialling. The live adapter exposes a read-only port, validates response
  identity, strips sensitive provider material, and routes terminal status/outcome through the
  existing transactional callback path. Call detail presents this as “Check provider status.”
- Security wording now matches production reality: published evaluator credentials do not identify
  a judge, and exact live mode permits bounded calls to the one provisioned contact. Keep live public
  exposure supervised and switch to demo mode when judge-triggered calling is not required.

## Verified

- 438/438 tests with PostgreSQL: 303 API + 133 app + 2 design tokens.
- ESLint, strict TypeScript, production build, token check and impeccable detector zero.
- Call-detail visual preview: 48px post-sidebar gutter at 1920×1080.
- Video: H.264/AAC, 1920×1080, 30 fps, 2:59.861, 15,577,376 bytes.
- Audio: mean -22.4 dB, peak -5.2 dB; stills and contact sheet visually reviewed.
- Video SHA-256: `6d5c91a16beebe9b6a259e2f57d0ce34a33a342989cfb2c87b4a064fc86c4c9b`.
- Thumbnail SHA-256: `24e98e98b9505c79736d376721549766ee25bb294444af11e019f948c4995970`.
- September 2 rerun: lint, strict typecheck, production build, token checker, impeccable detector,
  and 430 non-database tests pass (293 API + 135 app + 2 design tokens). Docker Desktop is stopped, so the 15 PostgreSQL integration tests
  were skipped after a connectivity-only failed attempt; their last database-backed run passed on
  August 16.
- Production dependency audit reports no known vulnerabilities; the working-tree credential-pattern
  scan found no high-confidence secret candidate.
- `vercel build --prod` succeeds locally without publication. The root runtime is pinned to Node
  `24.x`, matching CI and preventing an automatic jump to an untested future major.

## Remaining blockers

1. **Live-call provider startup latency.** The production deployment is in exact live mode, has a
   configured callable contact, and has the hardened webhook configuration. Authenticated provider
   inspection on 2026-09-02 found that the most recent live call did speak the correct FieldRelay
   prompt, but only after about 23 seconds of apparent dead air in a 45-second call. Historical proof
   contains a separate successful structured live result. Do not state that a fresh judge call is
   guaranteed until CALL-E explains or mitigates this voice-start delay.
2. **Public-source synchronization.** Release commit `423d60e` exactly records the deployed code but
   remains one commit ahead of `origin/main`; pushing it is an external publication that awaits user
   approval.
3. **Devpost/runtime wording mismatch.** The public page says the evaluator uses the simulated
   adapter, but production is intentionally in exact live mode for judges. Replace that one sentence
   with a truthful live-mode disclosure after explicit approval to edit the public submission.
4. **Repository license.** No license is currently present; this is not an official CALL-E submission
   requirement and remains a separate user choice.
5. **Optional feedback survey.** The drafted feedback entry remains a separate optional prize action.

The delayed-speech call remains a provider-diagnostics issue. Do not redial. A separate authorized
live structured result already proves runtime use.

## Cleanup and risks

- No retrieved production secret remains in workspace output.
- `D:\reelstack-project` is a private, pre-existing dirty authoring workspace. Do not commit or
  redistribute its ReelStack reference source into the public repository.
- Treat the formal-rules deadline of **2026-09-14 11:45 AM SGT** as authoritative and earlier.

## Exact next task

Obtain approval to push release commit `423d60e`, correct the stale public Devpost adapter sentence,
and send CALL-E support the persisted REST call id with the evidence-backed startup-delay report. Do
not place another metered call before the provider answers.
