---
name: Browser regression checks
description: Availability and fallback for authenticated browser-level regression checks in this workspace
---

The supported authenticated browser tester is not guaranteed to be available in every workspace mode. When available here, Vitest browser mode can use the system Chromium executable with Playwright; otherwise preserve the requested user-visible states and responsive layout contracts in deterministic UI tests.

**Why:** Browser-mode dependencies are not part of the existing web artifact, but this workspace has a system Chromium binary that supports real computed-layout checks when launched with container-safe flags.

**How to apply:** Check runner availability before planning an e2e-only change. For Vitest browser mode, use the system Chromium path when present and pass `--no-sandbox`, `--disable-dev-shm-usage`, and `--disable-gpu`. The default jsdom runner does not apply Tailwind layout CSS, so keep class/state fallbacks there and reserve measured `getBoundingClientRect()` assertions for browser mode. If unavailable, add stable state selectors and deterministic coverage for loading, empty, populated, desktop-layout, and mobile-responsive contracts; do not claim authenticated browser execution occurred.