# Devpost Readiness

**Verified:** 2026-09-03 against the official overview/rules, provider record, and live/local product.

| Requirement | Status | Evidence / next action |
|---|---|---|
| Deadline | CAUTION | Official pages conflict between 11:45 AM and 11:45 PM SGT on 2026-09-14. Operate to the earlier time. |
| Eligibility, country, conflicts | PASS CONFIRMED | User explicitly confirmed age, India residence, eligible jurisdiction, no sponsor conflict, and agreement to the official rules/terms on 2026-08-16. |
| Functional runtime CALL-E use | PASS | `docs/CALL_E_RUNTIME_PROOF.md` records an application-driven real call and structured result. |
| Public source repository | PASS | `https://github.com/AtchayamG/FieldRelay` is public. |
| Community contribution | PASS | [PR #107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) was approved and merged 2026-08-10. |
| Reproducible judge build | PASS | Docker judge images build; `/health` and `/` return 200. |
| Automated verification | PASS | GitHub Actions run `33678645033` passed the frozen install, lint, strict typecheck, PostgreSQL migration, full database-backed test suite, production build, design-token verification, and production dependency audit. |
| GitHub CI | PASS | Public `main` is current at release `1e50946`; run `33678645033` is green. |
| Audited production build | PASS | Vercel deployment `dpl_CpbMihM42QgSMSXeNs75xKcYfabD` is Ready and serves `fieldrelay-pi.vercel.app`; public health and evaluator sign-in return 200. |
| Live webhook completion | PASS FOR NEW CALLS | Encrypted production URL/token are configured and the hardened adapter is deployed. The historical missing-webhook task was recovered through the read-only reconciliation path. |
| Delayed-speech diagnosis | EXTERNALLY BLOCKED | Authenticated dashboard and REST reads show a 45-second call, terminal provider result, failed recipient attempt, no failure code/message, and the correct bot task beginning only after the recipient experienced a long connection delay. Provider support must explain or mitigate first-audio latency. Do not redial. |
| Lost-webhook recovery | PASS DEPLOYED | Session-protected reconciliation reads only an existing provider task, validates identity, strips sensitive material, and reuses the transactional callback path. It cannot place or retry a call. Historical `CALL-2042-0003` reconciled once to `completed` with `taskCompleted: false`. |
| Public video under 3 minutes | PASS PUBLIC | Published at `https://youtu.be/tq6L4HOqRXQ`; unauthenticated YouTube metadata resolves the approved title and thumbnail. H.264/AAC, 1920×1080, 2:59.861. |
| Gallery screenshots | PASS | Five visually inspected production captures in `assets/gallery/`. |
| Architecture diagram | PASS | Verified 1600×900 PNG and editable SVG in `assets/fieldrelay-architecture.*`. |
| Project answers | READY | Final narrative and required custom answers are assembled in `docs/DEVPOST_SUBMISSION_DRAFT.md` and `devpost-submission.md`. |
| Public description/runtime parity | PASS VERIFIED | The public story and judge testing instructions now state that production is intentionally in exact live mode, bounded to the single provisioned authorized target. The saved public page was read back on 2026-09-03. |
| Additional CALL-E calls | REQUESTED | The official form recorded the request for 200 calls and emailed a response receipt on 2026-09-03. Allocation is external and may take 1-5 business days. |
| Provider latency support | SENT | CALL-E support received the provider task id and verified approximately 23-second first-audio-delay report on 2026-09-03. Awaiting their response; no redial was performed. |
| CALL-E feedback prize | DRAFTED | `docs/CALL_E_FEEDBACK_SURVEY.md`; user supplies identity/scores and submits. |
| CALL-E account email | PASS CONFIRMED | User confirmed the address for direct transmission to Devpost; it is not persisted in the repository. |
| Repository license | HUMAN | Repository currently has no license; user chooses. |
| Final checkboxes and submit | PASS VERIFIED | Submission ID `1140281`; live Devpost readback reports FieldRelay published and entered in `call-e` at `2026-08-16T08:08:47.215-04:00`. Public page: `https://devpost.com/software/fieldrelay`. |

## Judge path

Live URL: `https://fieldrelay-pi.vercel.app`. Credentials are pre-filled; click **Continue as Demo Ops Manager**.

September 2 readback: the public API issued a session for the evaluator credentials, and the in-app
browser reached Mission Control. A cold serverless start can make the button sit on **Verifying
Session...** long enough to look stuck; wait for the redirect rather than refreshing immediately.

Recommended path: Mission Control → Incidents → incident detail → Calls & AI Ops → call detail → Approvals → Dispatch → Vendors → Analytics.

Do not invite general visitors to place real calls while the public environment is in live mode. Before sharing broadly, either deploy in demo mode or explicitly reserve live access for supervised judging.

## Winning strategy

Target **Most Practical Use Case**. FieldRelay's differentiated proof is not “AI can call”; it is the complete, reusable safety loop:

1. A concrete maintenance coordination problem with measurable operational cost.
2. CALL-E invoked at runtime, returning schema-constrained data.
3. Refusals demonstrated onscreen: authorization, idempotency, no auto-redial, privacy boundary, and human cost approval.
4. A real dispatch outcome, not a disconnected call demo.
5. Reusable community contribution, now merged upstream.

The four judging criteria are equally weighted: Real World Impact, Quality/reusability, Technical Implementation, and Product Experience/Demo. The application and public film cover all four. The project is submitted, the audited release is public, Devpost matches production, and the extra-call and provider-latency requests have been sent. Only external replies and the optional license/feedback decisions remain; neither is required to keep the current submission valid.
