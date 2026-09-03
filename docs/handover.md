# Handover

**Updated:** 2026-09-03 on local `main` after the release closeout. The user approved
pushing the release work, keeping production in live mode for judges, and completing the remaining
submission operations.

The guarded incident-owned call-launch control has now been exercised once with the user's explicit
action-time confirmation. Production task `CALL-2042-0004` completed with available `yes`, `$40`,
ETA `1440` minutes, confidence `0.9`, and retry limit `0`. Provider reconciliation updated the same
durable task; no second call was placed. The local 2:59.861 film now contains a clearly labelled,
time-edited excerpt from that call and its matching live result screen. Publishing the replacement
video and changing Devpost were approved and completed: the public replacement is
`https://youtu.be/34Jy7yKM_Ds`. Devpost's public iframe embeds the same id and submission `1140281`
remains SUBMITTED (5/5). The public YouTube player exposes English captions; thumbnail and checks
were verified. Release CI `33755986029` passed for `d9aff25`.

## Result

The application is functionally release-ready locally and the public production deployment is
healthy. The full 438-test database-backed gate,
lint, strict typecheck, production build, token checker and impeccable detector pass. A refreshed
2:59.861 Devpost walkthrough, SRT captions, and 1280×720 thumbnail exist under `assets/demo/`.
The previous video remains available at `https://youtu.be/tq6L4HOqRXQ`; the refreshed master is
public at `https://youtu.be/34Jy7yKM_Ds` and is now embedded on Devpost. The connected Devpost account
is registered for `CALL-E: Your Code Is Calling` with the user's confirmed rules and eligibility.
Devpost submission `1140281` is verified live at `https://devpost.com/software/fieldrelay`.
The required CALL-E contribution PR #107 is independently verified `APPROVED` and `MERGED`.

Final September 2 readback confirms `/health` and `/api/v1/auth/session` return 200, in-app browser
sign-in reaches Mission Control, and authenticated production reads for settings, calls, incidents,
approvals, dispatches, vendors, and analytics all return 200. Production remains in exact live mode
with one configured callable target, runtime target changes allowed, and the CALL-E Live Adapter
visible. No real call was placed during this check.

September 3 closeout pushed `1e50946`; GitHub Actions run `33678645033` is green across the full
database-backed gate and production audit. Vercel deployment `dpl_CpbMihM42QgSMSXeNs75xKcYfabD`
is Ready and now serves `https://fieldrelay-pi.vercel.app`. A fresh in-app evaluator login reaches
Mission Control, the call queue loads, every principal authenticated API returns 200, the bounded
live target remains configured, and reconciled live call `CALL-2042-0003` remains completed.

The public Devpost story and judge testing instructions now match exact live-mode production, and
the saved public page was read back successfully. The official additional-calls form recorded the
request for 200 CALL-E calls and emailed a response receipt. A concise support report for provider
task `call_FGQ5pBxDDlbwBhOdSu5LFQ` was sent from the confirmed CALL-E account describing the verified
approximately 23-second first-audio delay. No call was placed during these operations.

## Changes in this slice

- CALL-E Support logged the first-speech delay as public GitHub issue #295. It remains open, P2,
  needs investigation, and has no promised mitigation before judging.
- The incident Latest Call tab now reads mode and masked target, requires a two-step acknowledgement,
  and sends the existing safe API one incident-owned, zero-retry, idempotent request. The browser
  never receives or accepts a raw number. Non-terminal and ambiguous tasks block another launch;
  a completed task may be followed only as a separately prepared, newly confirmed task.
- The static HTML now renders a branded loading panel before Angular bootstrap and an actionable
  recovery message if bootstrap rejects, preventing the unexplained white page shown in one stale
  external-browser session.

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
- One user-authorized production call now proves the full provider loop. The edited film excerpt
  contains only the automated-assistant identity, disclosure, bounded question, and ETA/cost answer;
  it contains no phone number and is explicitly labelled `EDITED FOR TIME`. Raw audio and its local
  transcription are not committed.

## Verified

- 438/438 tests with PostgreSQL: 303 API + 133 app + 2 design tokens.
- ESLint, strict TypeScript, production build, token check and impeccable detector zero.
- Call-detail visual preview: 48px post-sidebar gutter at 1920×1080.
- Refreshed video: H.264/AAC, 1920×1080, 30 fps, 2:59.861, 12,615,620 bytes.
- Audio: mean -22.2 dB, peak -5.0 dB; representative transition and proof frames reviewed.
- Video SHA-256: `4d68d0f6b762f9a5510b3edef224f6ae3ade61ba83c6633d649ed26303de89b4`.
- Thumbnail SHA-256: `24e98e98b9505c79736d376721549766ee25bb294444af11e019f948c4995970`.
- September 2 rerun: lint, strict typecheck, production build, token checker, impeccable detector,
  and 430 non-database tests pass (293 API + 135 app + 2 design tokens). Docker Desktop is stopped, so the 15 PostgreSQL integration tests
  were skipped after a connectivity-only failed attempt; their last database-backed run passed on
  August 16.
- September 2 final production readback: public health 200, session issue 200, in-app browser sign-in
  reaches Mission Control, dial-target/calls/incidents/approvals/dispatches/vendors/analytics
  endpoints all return 200 with a signed evaluator session.
- GitHub Actions run `33678645033` passed frozen install, lint, typecheck, database migration, the
  full database-backed test suite, build, design-token verification, and production dependency
  audit after the `qs >=6.16.0` override repair.
- Production dependency audit reports no known vulnerabilities; the working-tree credential-pattern
  scan found no high-confidence secret candidate.
- `vercel build --prod` succeeds locally without publication. The root runtime is pinned to Node
  `24.x`, matching CI and preventing an automatic jump to an untested future major.

## Remaining blockers

1. **Live-call provider startup latency.** The production deployment is in exact live mode, has a
   configured callable contact, and has the hardened webhook configuration. Authenticated provider
   inspection on 2026-09-02 found that the most recent live call did speak the correct FieldRelay
   prompt, but only after about 23 seconds of apparent dead air in a 45-second call. The September 3
   evidence run completed end to end, but identical startup latency for judges is not guaranteed.
   Support issue #295 remains open and has no promised mitigation before judging.
2. **Repository license.** No license is currently present; this is not an official CALL-E submission
   requirement and remains a separate user choice.
3. **Optional feedback survey.** The drafted feedback entry remains a separate optional prize action.
4. **CALL-E additional-calls surname correction.** The Google Forms receipt confirms the request was
   received but records Last Name as `Ganesh`. The user's official surname is `G`, and the receipt has
   no edit-response link. Submit a corrected replacement only after explicit user approval.

The delayed-speech risk remains a provider-diagnostics issue. Do not redial merely to improve media;
`CALL-2042-0004` is the current authorized live proof.

## Cleanup and risks

- No retrieved production secret remains in workspace output.
- `D:\reelstack-project` is a private, pre-existing dirty authoring workspace. Do not commit or
  redistribute its ReelStack reference source into the public repository.
- Treat the formal-rules deadline of **2026-09-14 11:45 AM SGT** as authoritative and earlier.

## Exact next task

The approved video publication and Devpost replacement are complete. Do not place another call
for media. Provider issue #295 remains an external risk. The user declined correcting the old
additional-calls surname submission; leave it unchanged and use First Name `Atchayam` and
Last Name `G` in future entries. Any broader narrative/media revision is a separate task.
