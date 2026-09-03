# Demo Narration

Final narration for `assets/demo/fieldrelay-demo.mp4`. Voice:
`en-US-AvaMultilingualNeural` at `+13%`, generated with edge-tts. No music is used. From
1:14.303 to 1:38.263 the narration is replaced by a user-authorized excerpt from production task
`CALL-2042-0004`, visibly labelled `EDITED FOR TIME`.

FieldRelay is a field-operations console for property maintenance teams, connecting a reported incident, vendor coordination, and a human-authorized dispatch.

This is the deployed FieldRelay application. Evaluators enter with the demo operations account and can explore the working product without credentials or the risk of calling a real person. Mission Control shows active incidents, recent call tasks, approvals needing attention, dispatch progress, and the call-safety boundaries active in the environment.

When a tenant reports a problem, the operator records its location, category, priority, and description. FieldRelay assigns a durable identifier and keeps the status visible. Calls and AI Operations then shows each coordination task and its lifecycle instead of hiding phone work in another tool.

Before CALL-E can be contacted, FieldRelay verifies that the contact is authorized for the requested purpose. It commits the call task and idempotency reservation before any provider request, so a retry cannot silently create duplicate calls. Only the exact live configuration enables dialing, and the destination number stays inside server-side infrastructure.

The public evaluator session labels simulated sample records clearly. Production exact-live mode is bounded to the provisioned, authorized contact.

[Edited live-call evidence: automated-assistant identity, disclosure, bounded ETA/cost question, and the answer of twenty-four hours and forty dollars.]

FieldRelay reconciled that same task as completed: forty dollars, a twenty-four-hour arrival, and zero point nine confidence. The application stores validated fields, not the raw conversation.

A quoted cost creates a human decision, not an automatic purchase. The approval queue shows the evidence, reason, amount, and confidence. An operator can release, keep pending, or reject the work. Once approved, the dispatch board tracks the assignment through scheduled, en route, on site, and completed states.

Vendor authorization is equally visible. Operators review permitted call purposes, regional and language boundaries, contact status, and can revoke authorization without erasing history. Technicians, analytics, and settings complete the operational picture. Unmeasured values are described as awaiting evidence instead of being presented as misleading zeroes.

Under the interface, domain rules control the application and infrastructure adapters. CALL-E is one bounded integration. Ambiguous outcomes remain unknown and are never automatically redialed; phone numbers and provider payloads never enter the product record.

FieldRelay turns phone coordination into structured, reviewable operations while keeping people in control of cost and dispatch. The application is live, the source is public, and its reusable CALL-E service-dispatch skill is already merged upstream.
