# Customers & Properties — Page Specification

**Route:** `/customers`  
**Reference slug:** `11-customers`

## Purpose

Manage properties, operational contacts and location health.

## Authoritative mockups

- `mockups/dark/desktop/11-customers.png`
- `mockups/dark/tablet/11-customers.png`
- `mockups/dark/mobile/11-customers.png`
- `mockups/light/desktop/11-customers.png`
- `mockups/light/tablet/11-customers.png`
- `mockups/light/mobile/11-customers.png`

## Required sections

- Portfolio metrics
- Property filters
- Property cards
- Incident and satisfaction indicators

## Primary actions

- Add property
- Open property
- View contacts
- Filter region

## Responsive behavior

One property card per row with compact operational health indicators.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- healthy
- at risk
- high incident volume
- inactive
- contact verification needed

## Data dependencies

- property
- region
- units
- contacts
- open incidents
- CSAT

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
