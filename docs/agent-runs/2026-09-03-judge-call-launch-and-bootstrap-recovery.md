# Judge call launch and bootstrap recovery

## Result

Production was healthy in a fresh in-app browser context, including evaluator sign-in, while the
user's external browser showed an all-white page. The document now renders a branded loading state
before Angular starts and an actionable recovery state if bootstrap rejects.

The application had a safe server-side call-start contract but no operator control that could reach
it. Incident detail now provides that missing vertical slice. The Latest Call tab first loads any
existing call plus the deployment mode and masked target. With no existing task, an operator must
prepare the authorized workflow and separately acknowledge exactly one live metered or simulated
call. The request uses the configured contact ID, fixed vendor-availability purpose, 300-second bound,
zero retries, and one browser-generated idempotency key. A provider error refreshes the durable call
record and does not encourage redial.

CALL-E Support's September 3 reply was also reviewed. They recorded the approximately 23-second
first-speech delay as GitHub issue #295, possibly related to recent attacks but not yet diagnosed,
with no promised mitigation before judging.

## Files changed

- `apps/fieldrelay-app/index.html`
- `apps/fieldrelay-app/src/main.ts`
- `apps/fieldrelay-app/src/app/features/calls/application/call.port.ts`
- `apps/fieldrelay-app/src/app/features/calls/data/call-http.adapter.ts`
- `apps/fieldrelay-app/src/app/features/calls/data/call-http.adapter.spec.ts`
- `apps/fieldrelay-app/src/app/features/calls/domain/call.model.ts`
- `apps/fieldrelay-app/src/app/features/incidents/presentation/incident-detail/incident-detail.component.ts`
- `apps/fieldrelay-app/src/app/features/incidents/presentation/incident-detail/incident-detail.component.spec.ts`
- shared state, design, status, and handover documents

## Decisions and safety boundaries

- Reused the existing session-protected API and infrastructure-owned target; no parallel endpoint or
  client-side phone-number field was added.
- Kept the exact backend live-mode gate unchanged.
- The UI fixes purpose to `vendor_availability` and retries to zero for the judge path.
- Queued, in-flight, failed, unanswered, and outcome-unknown history suppresses the launch control.
  A completed task can be followed by a distinctly new, separately confirmed task, which is required
  because all three seeded judge incidents already have historical call records.
- No live call was placed during implementation or verification.

## Verification

- `pnpm --filter fieldrelay-app test`: 139 passed.
- `pnpm --filter fieldrelay-app typecheck`: passed.
- `pnpm --filter fieldrelay-app build`: passed.
- Focused ESLint: passed.
- `node scripts/check-tokens.mjs`: 66 defined, 57 referenced, all resolve.
- `npx impeccable detect apps/fieldrelay-app/src --no-config`: zero findings.

## Known limitation and exact next task

CALL-E issue #295 means a new call may again begin with substantial silence. Push and deploy this
slice, verify the signed-in production confirmation screen without submitting it, then ask the user
to be ready. Place one evidence call only after their immediate confirmation and inspect its result
before considering another.
