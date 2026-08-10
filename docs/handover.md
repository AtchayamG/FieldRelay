# Handover

**Updated:** 2026-08-10 on branch `codex/submission-readiness-audit`.

## Result

The audited application is merged, CI-green, deployed, and verified live. It is **not yet ready for final Devpost submission** because provider inspection/final phone evidence and several human/legal actions remain.

## What this audit fixed

- Upgraded Angular to 20.3.27 and aligned Angular DevKit overrides; production dependency audit is clean.
- Removed the duplicated pnpm version from CI, the cause of every recent run failing before install.
- Preserved the exact `CALL_E_MODE === 'live'` safety boundary with case/whitespace regression tests.
- Made live webhook configuration mandatory, HTTPS, token-bound, and always sent to CALL-E.
- Rejected empty CALL-E speaking tasks before resolving a number or contacting the provider.
- Corrected Mission Control to count all active domain statuses through repository queries instead of counting a recent page.
- Replaced misleading queued-call text that claimed no dialing had occurred.
- Removed nested main landmarks from Calls pages.
- Self-hosted Geist fonts, eliminating the deployed CSP violation caused by Google Fonts.
- Fixed the approved-approval capture flow.
- Renamed the existing cut to `fieldrelay-demo-DRAFT.mp4` and added a final-video release gate requiring genuine handset footage.
- Added exact historical Gitleaks fingerprint ignores; new leaks remain detectable.

## Verified

- 438 tests with PostgreSQL: 303 API + 133 app + 2 tokens.
- ESLint, strict typecheck, production build, token check, detector zero.
- `pnpm audit --prod`: no known vulnerabilities.
- Gitleaks full history: no leaks.
- Judge Docker image build and `/health` + `/` smoke tests pass.
- Local responsive browser audit passes all top-level routes.
- Live read-only audit returned 200 for all routes/deep links and exposed the production gaps above.

## Remaining blockers, in order

1. **CALL-E provider inspection.** A new broker authorization session is pending after the previous authorized exchange returned 502/timed out. No call may be placed first.
2. **Final phone evidence.** Only after provider inspection identifies a concrete correction, capture one supervised genuine call clip.
3. **CALL-E investigation.** Complete the refreshed CLI authorization and inspect `CALL-2042-0003`. Do not place another call before reading its status/transcript.
4. **Final demo.** Capture genuine phone footage only after the silent-call cause is understood; recapture the human approval gate; rebuild and review the under-three-minute video; upload publicly.
5. **Submission assets.** Architecture PNG/SVG and five production gallery screenshots are complete.
6. **Human/legal:** choose a repository license, provide CALL-E account email, complete eligibility/conflict attestations, submit the feedback survey, and approve the final Devpost submission.

The official deadline pages conflict between 11:45 AM and 11:45 PM SGT on 2026-09-14. Treat **11:45 AM SGT** as the safe deadline.

## Exact next task

Complete the pending CALL-E broker authorization/exchange and inspect the historical silent call. Do not place another call first.
