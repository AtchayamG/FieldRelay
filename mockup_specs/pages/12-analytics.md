# Analytics — Page Specification

**Route:** `/analytics`  
**Reference slug:** `12-analytics`

## Purpose

Measure incident, CALL-E, SLA, vendor and resolution performance.

## Authoritative mockups

- `mockups/dark/desktop/12-analytics.png`
- `mockups/dark/tablet/12-analytics.png`
- `mockups/dark/mobile/12-analytics.png`
- `mockups/light/desktop/12-analytics.png`
- `mockups/light/tablet/12-analytics.png`
- `mockups/light/mobile/12-analytics.png`

## Required sections

- KPI metrics
- Incident trend
- Category distribution
- Vendor SLA ranking
- SLA trend
- Call outcome distribution

## Primary actions

- Change range
- Filter property
- Export report
- Open vendor

## Responsive behavior

One visualization per section with readable labels and an accessible summary.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- loaded
- loading
- partial data
- no data
- exporting

## Data dependencies

- incident metrics
- SLA
- response time
- call outcomes
- vendor performance

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
