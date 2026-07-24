# Visual QA and Acceptance

## 1. Required screenshot matrix

For every route:

- desktop dark
- desktop light
- tablet dark
- tablet light
- mobile dark
- mobile light

Reference images are under `mockups/`.

## 2. Visual comparison process

1. Render implementation at the reference CSS viewport.
2. Capture screenshot without browser chrome.
3. Compare side by side with the reference.
4. Record gaps by severity.
5. Fix P0/P1 gaps.
6. Repeat in the paired theme.
7. Repeat at other breakpoints.

## 3. Severity

### P0

- route unusable
- clipped primary action
- page-level horizontal overflow
- unreadable theme contrast
- missing critical workflow component
- wrong or unsafe action

### P1

- major hierarchy mismatch
- missing status or metric
- incorrect responsive transformation
- inconsistent spacing affecting comprehension
- broken focus or keyboard behavior

### P2

- minor spacing, icon or typography mismatch
- subtle chart or border differences

## 4. Acceptance checklist

### Structure

- route has correct shell
- title and navigation state correct
- all reference sections present
- information order matches
- primary action location matches

### Theme

- dark and light parity
- text contrast passes
- borders remain visible
- semantic colours remain consistent
- no hard-coded colours leak from one theme

### Responsive

- no page horizontal overflow
- tables transform correctly
- bottom navigation does not cover content
- sticky action area does not hide fields
- local scrollers are intentional
- touch targets are large enough

### State

- loading state
- empty state
- error state
- permission-denied state
- disconnected realtime state
- call failure/no-answer state
- approval already decided state

### Accessibility

- keyboard reachable
- visible focus
- correct labels
- meaningful headings
- live updates announced appropriately
- chart alternative summary
- colour not sole signal

## 5. Route-specific critical checks

### Mission Control

Live call, queue, workflow, approvals and activity must not look like static unrelated cards.

### Create Incident

Wizard state, validation, AI summary and phone-workflow options must remain clear on mobile.

### Calls

Live status, transcript and structured outcome must clearly distinguish raw conversation from validated data.

### Dispatch

Map, workload and schedule must remain usable at tablet and mobile widths.

### Approval

Evidence, amount, policy, rationale and decision actions must be visible together.

### Audit & Consent

Integrity and consent status must be understandable without relying on green colour alone.

## 6. No Placeholder Completion Rule

Any placeholder, missing interaction, unhandled state or unresolved visual gap prevents completion status.
