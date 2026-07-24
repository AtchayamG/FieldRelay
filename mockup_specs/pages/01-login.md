# Secure Sign In — Page Specification

**Route:** `/auth/sign-in`  
**Reference slug:** `01-login`

## Purpose

Authenticate an organization user and establish a trusted session before any operational data or phone action is available.

## Authoritative mockups

- `mockups/dark/desktop/01-login.png`
- `mockups/dark/tablet/01-login.png`
- `mockups/dark/mobile/01-login.png`
- `mockups/light/desktop/01-login.png`
- `mockups/light/tablet/01-login.png`
- `mockups/light/mobile/01-login.png`

## Required sections

- FieldRelay product identity
- Operational value statement
- Email/password or organization SSO
- Remember-me and recovery controls
- Security and privacy reassurance

## Primary actions

- Sign in securely
- Continue with Google Workspace
- Forgot password

## Responsive behavior

Remove the decorative operations illustration, keep product identity, and prioritize a single-column sign-in form with comfortable touch targets.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- initial
- validating
- invalid credentials
- account locked
- SSO redirect
- offline

## Data dependencies

- email
- password
- organization identity
- session preference

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
