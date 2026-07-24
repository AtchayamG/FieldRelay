# Implementation Decisions

Record approved deviations from the blueprint using: issue, affected module, requirement, decision, reason, risk and approver.

## ADR-001 — Thin vertical slice before broad routes

- **Affected:** Entire implementation
- **Requirement:** Roadmap and product strategy require a working CALL-E workflow before broad mock screens.
- **Decision:** Build shell, incidents, CALL-E boundary, approval, dispatch, and audit as the first integrated slice.
- **Reason:** Produces judge-visible proof early and avoids disconnected placeholder pages.
- **Risk:** Remaining routes start later; mitigated by reusable tokens and shell.
- **Approval owner:** Blueprint-authorized implementation decision

## ADR-002 — Avoid speculative infrastructure in foundation

- **Affected:** API queue, object storage, realtime
- **Requirement:** Architecture requires replaceable asynchronous boundaries.
- **Decision:** Define ports and persistence-backed job state first; add external broker/object storage only when the working slice needs them.
- **Reason:** Keeps the hackathon build operable while preserving Clean Architecture boundaries.
- **Risk:** Scaling is deferred, not removed.
- **Approval owner:** Blueprint-authorized implementation decision
