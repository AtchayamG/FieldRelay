# Audit & Consent — Page Specification

**Route:** `/audit`  
**Reference slug:** `13-audit-consent`

## Purpose

Provide immutable operational history and visible authorization, disclosure and retention controls.

## Authoritative mockups

- `mockups/dark/desktop/13-audit-consent.png`
- `mockups/dark/tablet/13-audit-consent.png`
- `mockups/dark/mobile/13-audit-consent.png`
- `mockups/light/desktop/13-audit-consent.png`
- `mockups/light/tablet/13-audit-consent.png`
- `mockups/light/mobile/13-audit-consent.png`

## Required sections

- Audit metrics
- Immutable event log
- Consent health
- Data controls

## Primary actions

- Filter events
- Export signed report
- Review consent
- Open policy

## Responsive behavior

Audit table becomes chronological event cards; integrity and consent labels remain explicit.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- verified
- signature failure
- consent expiring
- consent revoked
- retention review

## Data dependencies

- actor
- action
- entity
- timestamp
- source
- integrity
- consent
- retention

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
