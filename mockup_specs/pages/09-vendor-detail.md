# Vendor Detail — Page Specification

**Route:** `/vendors/:vendorId`  
**Reference slug:** `09-vendor-detail`

## Purpose

Evaluate vendor availability, performance, rates, service area, compliance and recent work.

## Authoritative mockups

- `mockups/dark/desktop/09-vendor-detail.png`
- `mockups/dark/tablet/09-vendor-detail.png`
- `mockups/dark/mobile/09-vendor-detail.png`
- `mockups/light/desktop/09-vendor-detail.png`
- `mockups/light/tablet/09-vendor-detail.png`
- `mockups/light/mobile/09-vendor-detail.png`

## Required sections

- Vendor identity
- Performance score
- Live availability
- Recent jobs
- Compliance

## Primary actions

- Call vendor
- Message
- Request coverage
- Open job
- Manage compliance

## Responsive behavior

Stack vendor identity, score, availability, jobs and compliance with primary call action visible near the top.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- preferred
- active
- limited availability
- compliance review
- suspended

## Data dependencies

- vendor
- contacts
- rates
- availability
- performance
- jobs
- documents

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
