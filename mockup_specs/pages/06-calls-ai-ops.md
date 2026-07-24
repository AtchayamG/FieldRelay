# Calls & AI Operations — Page Specification

**Route:** `/calls`  
**Reference slug:** `06-calls-ai-ops`

## Purpose

Monitor CALL-E tasks, transcripts, queue state, extracted data and validated outcomes.

## Authoritative mockups

- `mockups/dark/desktop/06-calls-ai-ops.png`
- `mockups/dark/tablet/06-calls-ai-ops.png`
- `mockups/dark/mobile/06-calls-ai-ops.png`
- `mockups/light/desktop/06-calls-ai-ops.png`
- `mockups/light/tablet/06-calls-ai-ops.png`
- `mockups/light/mobile/06-calls-ai-ops.png`

## Required sections

- Active calls
- AI extraction
- Call queue
- Live transcript
- Structured outcome

## Primary actions

- Monitor
- Mute/hold/transfer where supported
- End/cancel
- Retry
- Open transcript
- Request approval

## Responsive behavior

Vertical call cards, compact transcript, and validated outcome beneath the conversation; never mix raw transcript with approved facts.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- queued
- ringing
- connected
- completed
- no answer
- failed
- cancelled
- outcome review

## Data dependencies

- call task
- provider task ID
- duration
- contact
- transcript
- outcome
- confidence
- failure code

## Interaction and accessibility requirements

- Every action has a visible focus state.
- Loading, empty, error and permission states must not reuse the normal content state with blank values.
- Status includes text and/or icon, not colour alone.
- Live updates announce meaningful changes without repeatedly interrupting assistive technology.
- Destructive or external real-world actions require confirmation when policy requires it.
- User-visible times use the organization/property timezone and expose an exact timestamp where ambiguity matters.

## Acceptance criteria

- All reference sections are implemented.
- Dark and light themes contain the same content and behavior.
- Desktop, tablet and mobile match the referenced hierarchy.
- No page-level horizontal overflow exists.
- Primary actions work against real or explicitly seeded backend state.
- Error and loading states are tested.
- Route passes the visual QA process in `docs/11_VISUAL_QA_AND_ACCEPTANCE.md`.
- The route is not marked complete while placeholders or missing reference elements remain.
