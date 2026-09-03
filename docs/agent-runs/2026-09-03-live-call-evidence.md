# 2026-09-03 — Live call evidence and film refresh

## Result

Placed exactly one user-confirmed production call through the deployed incident workflow. The call
completed and FieldRelay stored a schema-valid outcome: available `yes`, `$40`, ETA `1440` minutes,
confidence `0.9`. Reconciled that same provider task from `queued` to `completed` without redialling.
Refreshed the 2:59.861 presentation film with an edited excerpt and the matching production screen.

## Files changed

- `assets/demo/fieldrelay-demo.mp4`
- `assets/demo/fieldrelay-demo.srt`
- Demo, system-state, task-status, and handover documentation.

The Remotion source and derived audio stay in the user's private `D:\reelstack-project` workspace.
The raw attached recording and local transcription are not copied into this repository.

## Decisions

- Use the real app workflow, not the standalone CALL-E CLI, for judge-path proof.
- Never retry or create a second task; reconcile the first durable task in place.
- Include only four evidence beats: assistant identity, disclosure, bounded question, bounded answer.
- Label the excerpt `EDITED FOR TIME` and exclude the spoken name and phone number.
- Replace the old `$35` historical scene completely so the film never shows conflicting evidence.

## Verification

- Production UI: `CALL-2042-0004`, non-simulated, retry limit `0`, reconciled `completed`.
- Structured result: available `yes`, `$40`, ETA `1440`, confidence `0.9`.
- Attached recording: AAC-LC, 8 kHz mono, 100.737 seconds; speech confirmed by transcription and
  silence analysis. Derived evidence excerpt: 23.96 seconds plus a short matching narration summary.
- Remotion authoring lint and TypeScript: pass.
- Video: H.264/AAC, 1920×1080, 30 fps, 179.861 seconds, 12,615,620 bytes.
- Audio: mean -22.2 dB, peak -5.0 dB.
- SHA-256: `4d68d0f6b762f9a5510b3edef224f6ae3ade61ba83c6633d649ed26303de89b4`.
- Visual QA: proof-frame legibility plus both scene boundaries inspected; no return to the old `$35`
  evidence before the approval scene.

## Known limitations, cleanup, and risks

- CALL-E issue #295 remains open for provider-side first-speech latency. This run succeeded but does
  not guarantee identical startup latency for judges.
- The public YouTube video and Devpost link still point to the previous approved master until the
  user confirms the imminent public replacement actions.
- Disposable renders and transcription stay outside the public repository.

## Exact next task

After action-time confirmation, publish the refreshed video, update Devpost to its public URL, and
read both public surfaces back while signed out.
