---
name: esbuild bundling breaks pdfkit/fontkit
description: Which api-server deps must stay external in the esbuild bundle and why
---

The api-server bundles to a single ESM file via esbuild (`artifacts/api-server/build.mjs`). Packages whose dep chain does a runtime `require` of helper packages break when bundled — `pdfkit → fontkit → brotli` requires `@swc/helpers/cjs/_define_property.cjs`, which isn't installed and is already externalized as `@swc/*`, so the server crashes at startup with MODULE_NOT_FOUND.

**Why:** esbuild inlines the CJS `require` call but the helper resolution still happens at runtime relative to the bundle.

**How to apply:** add such packages (e.g. `pdfkit`) to the `external` array in `build.mjs`; they are real dependencies so pnpm resolves them from node_modules at runtime. Symptom to watch for: build succeeds, `node dist/index.mjs` fails with a missing helper module.
