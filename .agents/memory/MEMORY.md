# Memory Index

- [Sprint-gated build process](sprint-gated-builds.md) — this project requires explicit user approval between sprints; never start next-sprint scope without sign-off.
- [Clerk JIT provisioning + SUPER_ADMIN](clerk-jit-provisioning.md) — local User/Organization rows are created on first authenticated request; SUPER_ADMIN has no organization.
- [Orval generated schema naming](orval-schema-naming.md) — runtime zod schemas are named after the operationId, not the OpenAPI component ref name.
- [Object storage upload flow (web)](object-storage-upload-flow.md) — two-step presigned URL pattern via `useUpload`/`FileUpload`; store only the returned objectPath.
- [Workspace TS project references for lib packages](workspace-ts-project-refs.md) — any `lib/*` package referenced via TS project references needs `composite: true` in its own tsconfig.
- [pnpm overrides for peer deps](pnpm-peer-dep-overrides.md) — use root `pnpm.overrides` with literal versions (not catalog refs) to satisfy third-party peer dependency ranges when no root-level dependency exists to pin.
- [zod v4 + @hookform/resolvers mismatch](zod-v4-hookform-resolvers.md) — `@hookform/resolvers@^3.x` mishandles zod v4 errors, crashing forms mid-typing; needs `^5.x`.
- [Orval query hooks require explicit queryKey when using `enabled`](orval-query-enabled-requires-querykey.md) — passing `{query:{enabled}}` alone to a generated hook fails typecheck; also pass `getXxxQueryKey(...)`.
- [Clerk cssLayerName + manual @layer statement can break layout](clerk-tailwind-v4-layer-conflict.md) — a pre-declared `@layer ..., clerk, ...;` fixed Clerk contrast but caused side effects; use `!important` classes instead.
- [Tailwind v4: transform-none doesn't reset translate](tailwind-v4-translate-vs-transform-none.md) — `translate-x-*` uses the standalone `translate` property; cancel with `md:translate-x-0`, never `md:transform-none`.
