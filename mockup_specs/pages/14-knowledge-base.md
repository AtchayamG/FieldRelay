# Knowledge Base — Page Specification

**Route:** `/knowledge`  
**Reference slug:** `14-knowledge-base`

## Purpose

Give operators approved procedures and grounded answers before and during calls.

## Authoritative mockups

- `mockups/dark/desktop/14-knowledge-base.png`
- `mockups/dark/tablet/14-knowledge-base.png`
- `mockups/dark/mobile/14-knowledge-base.png`
- `mockups/light/desktop/14-knowledge-base.png`
- `mockups/light/tablet/14-knowledge-base.png`
- `mockups/light/mobile/14-knowledge-base.png`

## Required sections

- Knowledge search
- Category cards
- Recently used documents
- Grounded AI assistant

## Primary actions

- Search
- Browse category
- Open document
- Ask question
- Manage library

## Responsive behavior

Single-column search and category list; assistant answers show citations directly beneath recommendations.

Desktop uses the expanded sidebar and dense information layout. Tablet uses the icon rail and two-column reflow. Mobile uses the compact header, bottom navigation, single-column sections and card transformations described in `docs/04_RESPONSIVE_APP_SHELL.md`.

## Required states

- search results
- no result
- document loading
- answer generating
- source unavailable

## Data dependencies

- documents
- versions
- approval state
- categories
- citations
- answers

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
