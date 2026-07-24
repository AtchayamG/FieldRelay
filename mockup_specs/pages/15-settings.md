# Settings — Page Specification

**Route:** `/settings`  
**Reference slug:** `15-settings`

## Purpose

Configure organization identity, theme, policies, integrations, roles, security and retention.

## Authoritative mockups

- `mockups/dark/desktop/15-settings.png`
- `mockups/dark/tablet/15-settings.png`
- `mockups/dark/mobile/15-settings.png`
- `mockups/light/desktop/15-settings.png`
- `mockups/light/tablet/15-settings.png`
- `mockups/light/mobile/15-settings.png`

## Required sections

- Settings navigation
- Organization profile
- Appearance
- Operational defaults

## Primary actions

- Save changes
- Choose theme
- Toggle policy
- Open integration

## Responsive behavior

Settings categories become a horizontal selector or drawer; forms remain single column.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- unchanged
- dirty
- saving
- saved
- validation error
- permission denied

## Data dependencies

- organization
- theme
- timezone
- currency
- policy toggles
- security settings

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
