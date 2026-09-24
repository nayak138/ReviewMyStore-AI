---
name: VitePress with the workspace esbuild override
description: Compatibility note for building VitePress with the workspace's pinned esbuild version.
---

For VitePress documentation builds in this workspace, set Vite's production
build target to `esnext` if esbuild fails while lowering VitePress's default
browser target matrix.

**Why:** The workspace-wide esbuild override can reject VitePress's generated
destructuring transforms for its default browser targets. The docs site targets
modern browsers, so preserving those constructs with `esnext` is appropriate.

**How to apply:** Use `vite.build.target: "esnext"` in the VitePress config
when the build reports that destructuring transformation is unsupported. Keep
the shared esbuild override unchanged.