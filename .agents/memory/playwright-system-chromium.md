---
name: Workspace Chromium for browser checks
description: The workspace provides system Chromium for Playwright instead of Playwright's downloaded browser binary.
---

When local Playwright cannot find its cached Chromium executable, launch the workspace browser at `/repl/tools/bin/chromium` with `--no-sandbox`.

**Why:** The Playwright package can be present while its separately downloaded browser is absent; the workspace system Chromium is already available.

**How to apply:** For shell-driven Playwright checks, pass `executablePath: "/repl/tools/bin/chromium"` to `chromium.launch()` and include `--no-sandbox`.