# Incidents — Page Specification

**Route:** `/incidents`  
**Reference slug:** `03-incidents`

## Purpose

Search, filter, prioritize and manage the authoritative incident list.

## Authoritative mockups

- `mockups/dark/desktop/03-incidents.png`
- `mockups/dark/tablet/03-incidents.png`
- `mockups/dark/mobile/03-incidents.png`
- `mockups/light/desktop/03-incidents.png`
- `mockups/light/tablet/03-incidents.png`
- `mockups/light/mobile/03-incidents.png`

## Required sections

- Operational summary strip
- Filter and export controls
- Incident data table
- Pagination

## Primary actions

- Create incident
- Open incident
- Filter
- Export
- Bulk selection

## Responsive behavior

Transform the table into stacked cards showing ID, issue, property, priority, status and update time.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- default list
- no results
- empty organization
- loading
- permission restricted

## Data dependencies

- incident ID
- title
- property
- priority
- status
- owner
- SLA
- updated time

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
