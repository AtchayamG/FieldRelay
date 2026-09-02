# Devpost Readiness

**Verified:** 2026-09-02 against the official overview/rules, provider record, and live/local product.

| Requirement | Status | Evidence / next action |
|---|---|---|
| Deadline | CAUTION | Official pages conflict between 11:45 AM and 11:45 PM SGT on 2026-09-14. Operate to the earlier time. |
| Eligibility, country, conflicts | PASS CONFIRMED | User explicitly confirmed age, India residence, eligible jurisdiction, no sponsor conflict, and agreement to the official rules/terms on 2026-08-16. |
| Functional runtime CALL-E use | PASS | `docs/CALL_E_RUNTIME_PROOF.md` records an application-driven real call and structured result. |
| Public source repository | PASS | `https://github.com/AtchayamG/FieldRelay` is public. |
| Community contribution | PASS | [PR #107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) was approved and merged 2026-08-10. |
| Reproducible judge build | PASS | Docker judge images build; `/health` and `/` return 200. |
| Automated verification | PASS LOCAL | Current 430 non-database tests, lint/type/build, token check and detector zero pass. The last database-backed gate passed all 438 then-current tests on 2026-08-16; Docker is currently stopped, so the 15 SQL tests are skipped in the September rerun. |
| GitHub CI | PASS | The five latest public `main` runs were green on 2026-09-02; the current remote source revision is `4ead8ab`. |
| Audited production build | PASS | Vercel deployment `dpl_6cUXecjxzyhRHYw7LnnQqsXSS1cy` serves the audited reconciliation build at the production alias; `/health` returned 200 after deployment and again during the public-submission audit. Local release commit `423d60e` awaits approval to push. |
| Live webhook completion | PASS FOR NEW CALLS | Encrypted production URL/token are configured and the hardened adapter is deployed. The historical missing-webhook task was recovered through the read-only reconciliation path. |
| Delayed-speech diagnosis | EXTERNALLY BLOCKED | Authenticated dashboard and REST reads show a 45-second call, terminal provider result, failed recipient attempt, no failure code/message, and the correct bot task beginning only after the recipient experienced a long connection delay. Provider support must explain or mitigate first-audio latency. Do not redial. |
| Lost-webhook recovery | PASS DEPLOYED | Session-protected reconciliation reads only an existing provider task, validates identity, strips sensitive material, and reuses the transactional callback path. It cannot place or retry a call. Historical `CALL-2042-0003` reconciled once to `completed` with `taskCompleted: false`. |
| Public video under 3 minutes | PASS PUBLIC | Published at `https://youtu.be/tq6L4HOqRXQ`; unauthenticated YouTube metadata resolves the approved title and thumbnail. H.264/AAC, 1920×1080, 2:59.861. |
| Gallery screenshots | PASS | Five visually inspected production captures in `assets/gallery/`. |
| Architecture diagram | PASS | Verified 1600×900 PNG and editable SVG in `assets/fieldrelay-architecture.*`. |
| Project answers | READY | Final narrative and required custom answers are assembled in `docs/DEVPOST_SUBMISSION_DRAFT.md` and `devpost-submission.md`. |
| Public description/runtime parity | ACTION REQUIRED | The live Devpost page still says the public evaluator uses the simulated adapter. Production is intentionally in exact live mode for judges, so this sentence must be replaced with the approved live-mode disclosure before relying on the page as current. |
| CALL-E feedback prize | DRAFTED | `docs/CALL_E_FEEDBACK_SURVEY.md`; user supplies identity/scores and submits. |
| CALL-E account email | PASS CONFIRMED | User confirmed the address for direct transmission to Devpost; it is not persisted in the repository. |
| Repository license | HUMAN | Repository currently has no license; user chooses. |
| Final checkboxes and submit | PASS VERIFIED | Submission ID `1140281`; live Devpost readback reports FieldRelay published and entered in `call-e` at `2026-08-16T08:08:47.215-04:00`. Public page: `https://devpost.com/software/fieldrelay`. |

## Judge path

Live URL: `https://fieldrelay-pi.vercel.app`. Credentials are pre-filled; click **Continue as Demo Ops Manager**.

Recommended path: Mission Control → Incidents → incident detail → Calls & AI Ops → call detail → Approvals → Dispatch → Vendors → Analytics.

Do not invite general visitors to place real calls while the public environment is in live mode. Before sharing broadly, either deploy in demo mode or explicitly reserve live access for supervised judging.

## Winning strategy

Target **Most Practical Use Case**. FieldRelay's differentiated proof is not “AI can call”; it is the complete, reusable safety loop:

1. A concrete maintenance coordination problem with measurable operational cost.
2. CALL-E invoked at runtime, returning schema-constrained data.
3. Refusals demonstrated onscreen: authorization, idempotency, no auto-redial, privacy boundary, and human cost approval.
4. A real dispatch outcome, not a disconnected call demo.
5. Reusable community contribution, now merged upstream.

The four judging criteria are equally weighted: Real World Impact, Quality/reusability, Technical Implementation, and Product Experience/Demo. The application and public film cover all four. The project is already submitted. Remaining work is pushing the audited post-submission reconciliation commit, correcting the stale simulated-evaluator sentence on Devpost, provider support on delayed first audio, and the optional license/feedback decisions.
