---
name: Tailwind v4 — transform-none does not reset translate-x utilities
description: Why an off-canvas element stayed shifted off-screen at desktop despite md:transform-none; use md:translate-x-0 instead.
---

In Tailwind v4, `translate-x-*` utilities compile to the standalone CSS `translate` property, NOT `transform: translateX(...)`. Therefore `transform-none` (`transform: none`) does NOT cancel `-translate-x-full` — the element stays shifted by -100% of its width while `getComputedStyle(el).transform` misleadingly reads `"none"`.

**Why:** The mobile off-canvas sidebar pattern `"-translate-x-full md:relative md:transform-none"` (a common Tailwind v3 recipe) silently breaks in v4: at desktop the sidebar's flex slot reserves space but the content sits at `x = -width`, invisible. Diagnosis was confusing because computed `position`/`transform` looked correct; only `getComputedStyle(el).translate` reveals the shift.

**How to apply:** For show/hide-by-translation patterns, cancel with the matching utility: `mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"`. Never rely on `transform-none` to reset `translate`/`rotate`/`scale` utilities in v4. When debugging "element exists but invisible / off-screen", inspect `translate`, `rotate`, and `scale` computed properties in addition to `transform`.
