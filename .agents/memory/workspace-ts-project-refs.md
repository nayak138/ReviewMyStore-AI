---
name: Workspace TS project references for lib packages
description: Requirement for lib/* packages to set composite:true when referenced via TS project references from an artifact.
---

When an artifact's `tsconfig.json` adds a TS project reference to a `lib/*` workspace package (so the artifact can typecheck against that package's source), the referenced package's own `tsconfig.json` must set `"composite": true` (and typically `"declarationMap": true`). Without it, `tsc --build`/`typecheck` fails with a project-reference error, even though the package itself typechecks fine standalone.

**Why:** discovered when adding `lib/object-storage-web` as a project reference from the reviewmystore artifact — its tsconfig had `outDir`/`rootDir` but not `composite`, which TS project references require.

**How to apply:** whenever you add a new project reference from an artifact to a `lib/*` package (root `tsconfig.json` and the artifact's `tsconfig.json` both need the reference entry), check the target package's own tsconfig for `composite: true` first — most existing lib packages already have it, but ones written or lightly scaffolded before being reused as a reference target may not.
