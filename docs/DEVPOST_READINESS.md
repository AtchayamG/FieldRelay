# Devpost Readiness

**Verified:** 2026-07-24 using the Devpost connector and official CALL-E repositories.

| Requirement | Evidence | Status | Owner | Verification |
|---|---|---|---|---|
| Submission window open | Devpost CALL-E key dates | PASS | Codex | Connector reports `submissions_open` |
| Deadline | Devpost machine date: 2026-09-14 15:45 UTC / 23:45 SGT | RISK | Codex/user | Rules prose says 11:45 AM SGT; Devpost overview/key-date data say 11:45 PM SGT. Plan to the earlier time until host clarifies. |
| Age/jurisdiction/conflict eligibility | Official rules and required checkboxes | BLOCKED | User | Human truthfully confirms required attestations |
| Functional CALL-E use | backend runtime adapter and proof | TODO | Codex | CALL-E imported/called at runtime; evidence recorded |
| Significant in-period work | Git history and changelog after 2026-07-23 | TODO | Codex | Commit history and submission explanation |
| Upstream contribution PR | `CALLE-AI/awesome-phone-call-agents` | BLOCKED | Codex/user | Prepare contribution; user approves public PR |
| Public demo video under 3 minutes | YouTube/Vimeo URL | BLOCKED | User | `ffprobe` local export and public playback |
| Testing access | judge URL/build and instructions | TODO | Codex | Clean-browser smoke test |
| CALL-E account email | Devpost required field 27831 | BLOCKED | User | User supplies at submission time |
| Project/testing/use-case answers | Required Devpost fields | TODO | Codex | Draft factual answers from verified product |
| Final legal checkboxes and submit | Devpost | BLOCKED | User | Human review and final action |

## Official judging criteria

All four are equally weighted: Real World Impact, Quality of the Idea, Technical Implementation, and Product Experience & Demo. FieldRelay’s evidence chain is the real incident workflow, closed-loop multi-party coordination, runtime CALL-E execution, and polished responsive product.

## Required submission fields captured

Submitter type; countries; app status and in-period changes; testing instructions; optional demo URL; upstream PR URL; CALL-E email; primary use case; one-sentence real-world task; age, country, and conflict attestations. A public YouTube/Vimeo video is mandatory; website and zip are not.

## Official community reference

Use `CALLE-AI/awesome-phone-call-agents` for contribution structure and safety patterns: provider separation, dry-run paths, masked numbers, explicit side effects, cancellation, consent, idempotency, result handling, and credential boundaries. Reuse MIT-licensed code only when it is a direct fit and preserve notices.
