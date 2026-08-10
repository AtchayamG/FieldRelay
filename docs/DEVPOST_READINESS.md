# Devpost Readiness

**Verified:** 2026-08-10 against the official overview/rules and the live/local product.

| Requirement | Status | Evidence / next action |
|---|---|---|
| Deadline | CAUTION | Official pages conflict between 11:45 AM and 11:45 PM SGT on 2026-09-14. Operate to the earlier time. |
| Eligibility, country, conflicts | HUMAN | User must truthfully attest. |
| Functional runtime CALL-E use | PASS | `docs/CALL_E_RUNTIME_PROOF.md` records an application-driven real call and structured result. |
| Public source repository | PASS | `https://github.com/AtchayamG/FieldRelay` is public. |
| Community contribution | PASS | [PR #107](https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107) was approved and merged 2026-08-10. |
| Reproducible judge build | PASS | Docker judge images build; `/health` and `/` return 200. |
| Automated verification | PASS LOCAL | 438 tests with PostgreSQL, lint/type/build, detector zero, clean prod audit and secret scan. |
| GitHub CI | PASS | Draft PR #1 replacement run passed after the focused Linux test-spy type fix. |
| Audited production build | PASS | Merge `96034ff` deployed to Vercel Production; health/auth/routes/console/network verified live. |
| Live webhook completion | PASS FOR NEW CALLS | Encrypted production URL/token are configured and the hardened adapter is deployed. Existing stuck call remains historical. |
| Silent-call diagnosis | BLOCKED | Inspect `CALL-2042-0003` after refreshed CALL-E authorization. Do not redial first. |
| Public video under 3 minutes | BLOCKED | Existing 2:30 file is a draft slideshow with placeholder phone evidence and a stale approval frame. |
| Gallery screenshots | PASS | Five visually inspected production captures in `assets/gallery/`. |
| Architecture diagram | PASS | Verified 1600×900 PNG and editable SVG in `assets/fieldrelay-architecture.*`. |
| Project answers | DRAFTED | Refresh `docs/DEVPOST_SUBMISSION_DRAFT.md` after final evidence. |
| CALL-E feedback prize | DRAFTED | `docs/CALL_E_FEEDBACK_SURVEY.md`; user supplies identity/scores and submits. |
| CALL-E account email | HUMAN | User supplies at submission. |
| Repository license | HUMAN | Repository currently has no license; user chooses. |
| Final checkboxes and submit | HUMAN | User reviews and performs final action. |

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

The four judging criteria are equally weighted: Real World Impact, Quality/reusability, Technical Implementation, and Product Experience/Demo. The remaining work should therefore prioritize live correctness and a credible filmed story over adding more screens.
