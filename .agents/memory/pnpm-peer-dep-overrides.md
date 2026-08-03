---
name: pnpm overrides for peer deps
description: How to satisfy a third-party package's peer dependency range in this pnpm workspace when the root has no direct dependency to pin.
---

To satisfy a dependency's peer-dependency range (e.g. Uppy v5 wanting React 19) in this pnpm monorepo, add a root-level `pnpm.overrides` entry with a **literal version string** (e.g. `"react": "19.1.0"`), not the `$react` catalog-reference syntax — pnpm rejects catalog references in `overrides` when the root `package.json` has no direct dependency on that package to catalog against.

**Why:** hit this pinning Uppy v5's React peer dependency for `@workspace/object-storage-web`; the catalog-reference form silently failed to resolve.

**How to apply:** if `pnpm install` complains about an unmet peer dependency for a shared lib package, add/adjust the override with a literal version matching what the workspace's artifacts already use, then re-run `pnpm install`.
