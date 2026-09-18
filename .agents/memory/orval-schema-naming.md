---
name: Orval generated schema naming
description: Which generated zod schema names are usable at runtime vs. type-only, in this project's Orval codegen setup.
---

Orval in this project always names the generated **zod runtime schemas** after the OpenAPI **operationId** (e.g. `CreateBusinessBody`, `ListBusinessesResponse`), never after the OpenAPI **component schema ref name** (e.g. `BusinessCreateInput`). The component ref name only survives as a pure TypeScript type — it has no corresponding runtime export.

**Why:** caused real build breakage when route code imported a component-ref-named schema expecting to call `.parse()`/`.safeParse()` on it — that name doesn't exist as a value, only as a type.

**How to apply:** when writing/reviewing Express route handlers that validate request bodies or shape responses with a generated schema, always import the operationId-derived name for runtime validation. If unsure which name is runtime-safe, check the generated client output rather than guessing from the OpenAPI spec's component names.

For endpoints that combine a required path parameter with optional query parameters, Orval splits the generated runtime schemas into path and query names while the TypeScript barrel can emit a same-named params type, causing a TS2308 collision. Prefer the existing query-scoped pattern (for example, `businessId` plus optional filters) when that contract remains tenant-safe.

**Why:** a path-plus-query analytics endpoint caused codegen to fail because `GetBusinessAnalyticsParams` was emitted both as a runtime schema and a type.

**How to apply:** if a new endpoint needs both a required resource id and optional filters, use a query-scoped endpoint or choose a contract shape that avoids duplicate generated params names, then re-run codegen before writing route imports.
