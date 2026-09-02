# 2026-09-02 final public sync

## Result

The user approved the final public source sync and confirmed production should remain in exact live
mode for judges. Production remains healthy and judge-facing auth works. No metered CALL-E call was
placed.

## Readbacks

- Public health: `GET https://fieldrelay-pi.vercel.app/health` returned 200.
- Public auth: `POST /api/v1/auth/session` with the published evaluator credentials returned 200 and
  issued a session token, redacted in command output.
- In-app browser: clicking **Continue as Demo Ops Manager** on `/auth/sign-in` reached Mission
  Control. A cold start can leave the button on `Verifying Session...` for several seconds before
  redirect.
- Authenticated production APIs returned 200 for dial-target settings, calls, incidents, approvals,
  dispatches, vendors, and analytics.
- Settings readback shows exact live mode exposure: one configured callable `CNS-4491` target, masked
  phone only, region `IN`, locale `en-IN`, and runtime target changes allowed.
- CALL-E upstream contribution PR #107 remains `APPROVED` and `MERGED`.

## Safety decision

The live-call provider startup-latency issue is still external. FieldRelay can prove live adapter
configuration, webhook/reconciliation behavior, authorization, and a historical live structured
result, but should not promise a fresh call will speak promptly until CALL-E explains or mitigates
the roughly 23-second first-audio delay seen in the August call. No redial or new test call was
performed.

## Public artifact decision

The submitted video, captions, thumbnail, and Devpost payload are intentionally included in the next
public source sync so judges and future agents can inspect the actual submitted artifacts rather than
only the older draft video.
