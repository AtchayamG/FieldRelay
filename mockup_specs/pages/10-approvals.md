# Approvals — Page Specification

**Route:** `/approvals`  
**Reference slug:** `10-approvals`

## Purpose

Enable accountable human decisions with policy, evidence, amount and operational impact visible together.

## Authoritative mockups

- `mockups/dark/desktop/10-approvals.png`
- `mockups/dark/tablet/10-approvals.png`
- `mockups/dark/mobile/10-approvals.png`
- `mockups/light/desktop/10-approvals.png`
- `mockups/light/tablet/10-approvals.png`
- `mockups/light/mobile/10-approvals.png`

## Required sections

- Approval metrics
- Filter tabs
- Approval cards
- AI rationale
- Decision controls

## Primary actions

- Approve
- Reject
- Request changes
- Open incident
- Open policy

## Responsive behavior

One approval card per row; decision buttons remain visible without hiding evidence.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- pending
- urgent
- approved
- rejected
- changes requested
- expired
- already decided

## Data dependencies

- request type
- incident
- vendor
- amount
- policy
- evidence
- rationale
- decision

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
