# Technicians — Page Specification

**Route:** `/technicians`  
**Reference slug:** `08-technicians`

## Purpose

Review technician availability, qualifications, performance and suitability for work.

## Authoritative mockups

- `mockups/dark/desktop/08-technicians.png`
- `mockups/dark/tablet/08-technicians.png`
- `mockups/dark/mobile/08-technicians.png`
- `mockups/light/desktop/08-technicians.png`
- `mockups/light/tablet/08-technicians.png`
- `mockups/light/mobile/08-technicians.png`

## Required sections

- Availability metrics
- Roster filters
- Technician cards
- Skills and compliance
- Assignment actions

## Primary actions

- View profile
- Assign job
- Filter
- Add technician

## Responsive behavior

Single-column technician cards with status, skills, performance and assignment controls.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- available
- busy
- en route
- offline
- suspended
- compliance expired

## Data dependencies

- profile
- trade
- region
- rating
- jobs
- SLA
- skills
- availability

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
