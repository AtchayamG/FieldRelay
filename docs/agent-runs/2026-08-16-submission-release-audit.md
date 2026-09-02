# 2026-08-16 — Submission release audit

## Result

Closed the call-detail alignment defect, repaired environment-isolation and remote-database test
gaps, verified the complete application gate, and produced a detailed local Devpost walkthrough
without placing a new CALL-E call.

The approved walkthrough was subsequently published at `https://youtu.be/tq6L4HOqRXQ`, and
FieldRelay was submitted to `CALL-E: Your Code Is Calling` as submission `1140281`. Live Devpost
readback verifies the published project at `https://devpost.com/software/fieldrelay`.

## Files changed

- `apps/fieldrelay-app/src/app/features/calls/presentation/call-detail/call-detail.component.ts`
- `apps/fieldrelay-api/src/app.module.ts`
- `apps/fieldrelay-api/src/tests/pg-unit-of-work.integration.spec.ts`
- `assets/demo/fieldrelay-demo.mp4`
- `assets/demo/fieldrelay-demo.srt`
- `assets/demo/fieldrelay-thumbnail.png`
- Submission, demo, design-system, state, status, and handover documents.

The Remotion authoring source remains private in the user's existing `D:\reelstack-project` and
is not copied into the public repository.

## Decisions

- Use the real application as the visual foundation and explain the full product in detail.
- Use 16:9 deployed-app footage and real application screens for judge legibility.
- Label evaluator behavior as simulated and the historical live result as verified past evidence.
- Explain live CALL-E behavior without reenacting it; do not redial the unresolved silent call.
- Replace the empty approval screenshot after visual QA with the genuine approved quote card.
- Do not use generated stock footage: it was unnecessary and weaker evidence than the working app.
- After user review, use Sahaaya's warm editorial presentation as a quality reference while keeping
  FieldRelay's own Geist typography, colors, logo, and real product evidence.
- Keep the dark UI authentic within a lighter presentation frame. Preserve all judge-relevant
  application and architecture content: contain dense pages without transforms and trim only unused
  bottom workspace on sparse pages.

## Verification

- `pnpm test` with PostgreSQL and `CALL_E_MODE=demo`: 438/438 tests.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: pass.
- `node scripts/check-tokens.mjs`: 66 defined, 57 referenced, all resolve.
- `npx impeccable detect apps/fieldrelay-app/src --no-config`: zero findings.
- Focused call-detail component test: 13/13.
- Focused CALL-E webhook/selection test: 30/30.
- Remote PostgreSQL integration test: 15/15.
- Remotion lint/type check: pass.
- Media probe: H.264/AAC, 1920×1080, 30 fps, 179.861 seconds, 15,577,376 bytes.
- Audio scan: mean -22.4 dB, peak -5.2 dB.
- Video SHA-256: `6d5c91a16beebe9b6a259e2f57d0ce34a33a342989cfb2c87b4a064fc86c4c9b`.
- Thumbnail SHA-256: `24e98e98b9505c79736d376721549766ee25bb294444af11e019f948c4995970`.
- Thumbnail, eight representative walkthrough stills, and nine-frame contact sheet visually reviewed.

## Known limitations and risks

- Changes are local and not deployed; production deployment needs explicit approval.
- The video is local until the submitter approves and uploads it publicly.
- Devpost registration, license choice, account email, and legal attestations are human decisions.
- The historic REST call id still cannot be inspected through CALL-E's MCP-only run-id lookup.

## Cleanup

No retrieved production secret remains. Disposable authoring stills and contact sheets remain in
the private ReelStack workspace only.

## Exact next task

Obtain end-to-end video approval, then publish it and insert its public URL into the submission
draft. Deploy the audited local code only after explicit approval.
