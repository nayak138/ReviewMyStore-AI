---
name: Browser regression checks
description: Availability and fallback for authenticated browser-level regression checks in this workspace
---

The supported authenticated browser tester is not guaranteed to be available in every workspace mode. When it is unavailable, preserve the requested user-visible states and responsive layout contracts in the artifact's deterministic UI tests rather than adding an unconfigured second browser framework.

**Why:** Browser-mode dependencies are not part of the existing web artifact, and an unavailable tester cannot provide a meaningful authenticated result.

**How to apply:** Check runner availability before planning an e2e-only change. If unavailable, add stable state selectors and deterministic coverage for loading, empty, populated, desktop-layout, and mobile-responsive contracts; do not claim authenticated browser execution occurred.