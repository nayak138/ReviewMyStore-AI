---
name: Sprint-gated build process
description: This project is built incrementally by sprint, with explicit user sign-off required between sprints.
---

The user mandates building ReviewMyStore.ai one sprint at a time. Each sprint has an explicit, scoped feature list agreed with the user up front. Do not pull forward work from a future sprint (e.g. Campaigns, QR/NFC, AI review generation, Analytics, Orders, Super Admin console are explicitly deferred) even if it would be convenient while touching related code.

**Why:** the user wants to review and approve each increment before more scope is built on top of it, to keep the build reviewable and avoid rework if direction changes.

**How to apply:** before starting any new sprint of work, confirm the scoped feature list with the user. Before ending a sprint, run the app, fix all typecheck/build errors, verify the sprint's features end-to-end (including responsiveness and RBAC where relevant), and then stop and explicitly ask for approval before starting the next sprint's scope.
