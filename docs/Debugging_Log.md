# Debugging Log

Record implementation defects, root causes, fixes and regression tests here.

## 2026-07-24 — Toolchain baseline

- `npx ng version` failed because Angular is not installed globally or in a workspace.
- Resolution: pin Angular/Ionic tooling in the workspace rather than relying on a global CLI.
