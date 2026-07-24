# Visual Parity Report

## 2026-07-24 foundation pass

Reference: `mockup_specs/mission-control.md` and the dark desktop/mobile Mission Control mockups.

### Verified in production preview

- Dark desktop Mission Control preserves the reference hierarchy: fixed topbar, navigation rail, state controls, four metrics, incident queue, simulated CALL-E mission, orchestration, approvals, activity, and performance.
- Light theme switches immediately and retains readable semantic contrast.
- The 430 x 932 layout uses the compact topbar, two-column metrics, mobile incident cards, bottom navigation, and a wrapped state selector.
- Main content scrolls independently without clipping; document and content widths match their viewports.
- Sign-in renders correctly in dark and light themes.
- No console errors or warnings appeared in a fresh production-preview smoke run.

### Interaction evidence

- Demo sign-in reaches `/mission-control`.
- Sign-out returns to `/auth/sign-in`.
- Disconnected state displays its cached-data warning.
- Approval action replaces its buttons with the recorded decision and updates the pending count.
- Theme control updates the document theme.

### Open parity/performance work

- Automate image-diff baselines for 430, 768, 1024, 1280, and 1920 px.
- Replace emoji pictograms with an accessible, repo-native icon system during the polish pass.
- Reduce the 1.21 MB initial JavaScript chunk.
- Validate remaining route mockups only as each real vertical slice is implemented; no placeholder screens are accepted.
