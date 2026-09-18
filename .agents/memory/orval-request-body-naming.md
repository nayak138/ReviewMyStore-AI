---
name: Orval request-body naming
description: Prevent duplicate generated Zod exports when an OpenAPI operation has a request body.
---

Use a distinct component schema name for request bodies when the operation also generates a body schema. For example, name the component `CustomerActionInput` rather than `TrackCustomerActionBody`; Orval reserves the latter for the operation-level Zod schema.

**Why:** Orval's Zod output exports the operation body validator from `generated/api.ts` and the component type from `generated/types`. Reusing the operation-derived name creates a TypeScript duplicate export in the package barrel.

**How to apply:** When adding a request-body `$ref`, choose a domain/input name that does not match `<OperationId>Body`, then run the API codegen and library typecheck together.