# Codex handoff — paste this to start

Copy the block below into Codex verbatim. It is written to be self-contained: it names the files to read, the order to work in, and the rules that must not be broken.

---

```text
You are picking up FieldRelay, a hackathon submission for the CALL-E "Your Code Is
Calling" hackathon. Deadline 2026-09-14 23:45 SGT. Repo is at
D:\Work\Codex\Hackathon Projects\FieldRelay and main is green and deployed.

READ THESE FIRST, IN THIS ORDER, BEFORE TOUCHING ANYTHING:
  1. docs/handover.md                  - current state and the open blocker
  2. docs/OPEN_ISSUE_SILENT_CALL.md    - the blocker in full
  3. docs/SYSTEM_STATE_FOR_AGENTS.md   - what exists, and traps that have caught people
  4. AGENTS.md                         - non-negotiable rules
  5. docs/DESIGN_SYSTEM.md             - read before changing ANY UI file

CURRENT STATE
  Live:        https://fieldrelay-pi.vercel.app  (sign-in pre-filled, one click)
  Repo:        https://github.com/AtchayamG/FieldRelay
  Upstream PR: https://github.com/CALLE-AI/awesome-phone-call-agents/pull/107  (open)
  Tests:       418 passing (283 API + 133 app + 2 tokens)
  Detector:    npx impeccable detect apps/fieldrelay-app/src --no-config  => zero
  All 10 navigation routes are built. No disabled nav items remain.
  Demo video:  assets/demo/fieldrelay-demo.mp4, 2:30, with a 17.8s placeholder at beat 4.

TASK 1 - THE BLOCKER (do this first, nothing else matters until it is resolved)

A live call rings, is answered, and then NOBODY SPEAKS. It closes itself. The
call record stays "queued" forever. Full detail in docs/OPEN_ISSUE_SILENT_CALL.md.

  1a. Open the CALL-E dashboard and read the record for call CALL-2042-0003
      (placed 2026-08-10 13:42 UTC). Report status, duration and transcript.
      DO NOT SKIP THIS. It separates "we sent a bad request" from "their agent
      failed", and every other step is guesswork until it is done.

  1b. Set these in Vercel production, then redeploy. They are currently MISSING,
      which is why no call can ever leave "queued" - the adapter only sends
      webhook_url when the variable is set, so CALL-E has nowhere to report:
          CALLE_WEBHOOK_TOKEN=<long random token>
          CALLE_WEBHOOK_URL=https://fieldrelay-pi.vercel.app/api/v1/call-e/webhook?token=<same token>
      Do not print the token to a terminal.

  1c. In apps/fieldrelay-api/src/infrastructure/call-e/calle-api.adapter.ts,
      assert that the composed `task` string is non-empty before posting, and
      throw CallValidationError if it is not. Log its LENGTH only, never its
      contents. A call that says nothing still costs a call and a person's time.

  1d. Prime suspect for the silence is locale "en-IN" having no usable voice.
      Check which region/locale the earlier SUCCESSFUL call used - it is recorded
      in docs/CALL_E_RUNTIME_PROOF.md - and compare. If it differs, changing the
      locale to en-US in Settings is a one-field test.

  1e. Only after 1a-1d, place ONE more call. If it works, film the phone ringing
      and drop the clip into beat 4 of the demo video.

TASK 2 - REMAINING SUBMISSION WORK
  - Architecture diagram for the Devpost write-up.
  - Gallery screenshots (Mission Control guardrails, Approvals, Dispatch, Vendors).
  - Submit the CALL-E feedback survey. Draft is written and ready at
    docs/CALL_E_FEEDBACK_SURVEY.md - it is a separate prize category
    (5 winners x $200 + credits) and only needs name/username/email and two
    1-10 scores filled in.
  - Final Devpost write-up from docs/DEVPOST_SUBMISSION_DRAFT.md.

RULES THAT MUST NOT BE BROKEN
  * CALL BUDGET. Four calls are spent from a finite allowance reserved for judges.
    NEVER place a call to test a code change - the demo adapter exists for that.
  * NEVER RETRY A STUCK CALL. A client timeout already caused a duplicate dial
    once, and CALL-2042-0003 proves a call can complete on CALL-E's side while
    our record still reads "queued". Redialling on a stale local status is
    exactly how a real person gets rung twice.
  * NEVER RENDER AN UNMEASURED VALUE AS A FIGURE. "SLA Compliance (0%)" shipped
    once from a struct default and told every judge the system meets its SLA zero
    percent of the time. Analytics returns counts only and a test FAILS if a
    percent sign appears in the payload. Do not "improve" Analytics or
    Technicians by adding rates - they are sparse on purpose.
  * NEVER FABRICATE DEMO EVIDENCE. Do not generate video of a phone ringing, do
    not invent metrics, do not seed data that is not labelled simulated. The
    entire pitch is that this system refuses to assert what it cannot support.
  * DESIGN IS A CONTRACT. Run the impeccable detector after any UI change; it
    must stay at zero. No side-tab borders. Geist only, never Inter. Status
    colour is functional and must stay legible by hue.
  * CHECK THE DEPLOYMENT, NOT THE FIXTURES. Two defects passed every test and
    were only caught by querying the live API.
  * DOCUMENTATION IS PART OF EVERY STEP. Update docs/taskstatus.md,
    docs/handover.md, docs/SYSTEM_STATE_FOR_AGENTS.md and add a run record under
    docs/agent-runs/ as each step completes - not at the end.
  * Do not publish, deploy, open a PR or submit to Devpost without explicit
    approval from Atchayam.

VERIFY BEFORE EVERY COMMIT
  npx eslint .
  pnpm -r typecheck
  pnpm -r test
  node scripts/check-tokens.mjs
  npx impeccable detect apps/fieldrelay-app/src --no-config
```

---

## What to say to Codex in your own words

If you'd rather summarise it yourself, the three things Codex must not miss:

1. **Read `docs/OPEN_ISSUE_SILENT_CALL.md` first, and check the CALL-E dashboard before doing anything else.** The temptation will be to start changing code; the dashboard is what makes that change informed rather than a guess.
2. **The webhook variables are missing in production.** That's a certain, separate fault from the silence, and it's why no live call can ever complete on screen.
3. **Do not place test calls.** Four are spent, the allowance is for judges, and the last stuck-looking call turned out to be a config problem rather than a failed dial.
