# Mission Control — Page Specification

**Route:** `/mission-control`  
**Reference slug:** `02-mission-control`

## Purpose

Provide the live operational picture: incidents, CALL-E activity, workflow state, approvals, SLA risk and performance.

## Authoritative mockups

- `mockups/dark/desktop/02-mission-control.png`
- `mockups/dark/tablet/02-mission-control.png`
- `mockups/dark/mobile/02-mission-control.png`
- `mockups/light/desktop/02-mission-control.png`
- `mockups/light/tablet/02-mission-control.png`
- `mockups/light/mobile/02-mission-control.png`

## Required sections

- Critical incident metrics
- Incident command queue
- Live call mission
- Orchestration flow
- Pending approvals
- System activity
- Operational performance

## Primary actions

- Create incident
- Open incident
- Monitor call
- Approve/review
- Open workflow
- Open analytics

## Responsive behavior

Two-column metrics, incident cards, vertical sections, bottom navigation, and simplified charts. Preserve all critical actions.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- live connected
- realtime disconnected
- no incidents
- loading
- partial service degradation

## Data dependencies

- incident summary
- active calls
- approval count
- SLA metrics
- workflow events

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
