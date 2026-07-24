# Dispatch Board — Page Specification

**Route:** `/dispatch`  
**Reference slug:** `07-dispatch`

## Purpose

Assign incidents based on location, availability, SLA, skills, cost and workload.

## Authoritative mockups

- `mockups/dark/desktop/07-dispatch.png`
- `mockups/dark/tablet/07-dispatch.png`
- `mockups/dark/mobile/07-dispatch.png`
- `mockups/light/desktop/07-dispatch.png`
- `mockups/light/tablet/07-dispatch.png`
- `mockups/light/mobile/07-dispatch.png`

## Required sections

- Unassigned incidents
- Live field map
- Technician workload
- Dispatch calendar

## Primary actions

- Auto-assign
- Drag/assign
- Open map layers
- View schedule
- Reschedule

## Responsive behavior

Show map first, followed by unassigned incidents and workload cards. Calendar may use a contained horizontal scroller.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- live availability
- stale location
- no technician
- route conflict
- assignment pending
- dispatched

## Data dependencies

- incident location
- technician location
- availability
- route
- schedule
- skill fit
- SLA

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
