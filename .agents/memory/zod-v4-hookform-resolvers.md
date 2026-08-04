---
name: zod v4 + @hookform/resolvers version mismatch
description: Why react-hook-form + zodResolver can crash the whole page with an unhandled promise rejection in this workspace, and the fix.
---

The workspace catalog pins `zod` to `^4.0.0`. If a package's `package.json` has `@hookform/resolvers` on the `^3.x` line (which only properly supports zod v3's error-issue shape), `zodResolver` can throw/reject instead of returning `{ values, errors }` when a form fails partial validation (e.g. user has filled one required field but not another). This surfaces as an uncaught `ZodError` / unhandled promise rejection in the browser, which trips the dev runtime-error overlay and makes the page look completely frozen/non-interactive ("can't go anywhere from this").

**Why:** zod v4 changed its internal issue format (e.g. issues carry an `origin` field); `@hookform/resolvers@3.10.0` was built against zod v3's shape and mishandles v4 errors instead of catching them.

**How to apply:** any package using `useForm` + `zodResolver` from `@hookform/resolvers` must have `@hookform/resolvers@^5.x` (peer-supports `zod": "^3.25.0 || ^4.0.0"`), not `^3.x`. If a form appears to "freeze" or the page shows a runtime-error overlay while typing/blurring fields (not on submit), check this version pairing first via `pnpm why zod` / the installed `@hookform/resolvers` version before assuming it's a form-logic bug.
