# Create Incident — Page Specification

**Route:** `/incidents/new`  
**Reference slug:** `05-create-incident`

## Purpose

Capture a verified incident and configure the initial authorized phone workflow.

## Authoritative mockups

- `mockups/dark/desktop/05-create-incident.png`
- `mockups/dark/tablet/05-create-incident.png`
- `mockups/dark/mobile/05-create-incident.png`
- `mockups/light/desktop/05-create-incident.png`
- `mockups/light/tablet/05-create-incident.png`
- `mockups/light/mobile/05-create-incident.png`

## Required sections

- Five-step wizard
- Incident form
- AI summary
- Attachments
- Phone workflow options
- Wizard actions

## Primary actions

- Save draft
- Continue
- Cancel
- Upload evidence
- Select phone workflow

## Responsive behavior

One-column form with sticky bottom navigation, full-width controls, and AI summary below incident details.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- draft
- validating
- validation error
- uploading
- AI summary loading
- ready to continue

## Data dependencies

- property
- unit
- incident type
- priority
- reporter
- authorized number
- description
- evidence
- workflow options

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
