---
name: Clerk express test auth bypass
description: How to fake Clerk authentication in api-server route tests without calling the Clerk API.
---

# Faking Clerk auth in route tests

Rule: to test Express routes behind `requireAuth` without the Clerk SDK or
network, install a middleware that attaches the same branded auth handler
`clerkMiddleware` would:

```ts
const clerkAuthBrand = Symbol.for("@clerk/express.auth");
app.use((req, _res, next) => {
  const authFn = () => ({ userId: testUserId ?? null, tokenType: "session_token" });
  (req as any).auth = Object.assign(authFn, { [clerkAuthBrand]: true });
  next();
});
```

**Why:** `getAuth` from `@clerk/express` recognizes `req.auth` only when it
carries the `Symbol.for("@clerk/express.auth")` brand, and the default
`acceptsToken` accepts `tokenType: "session_token"`. Returning `userId: null`
exercises the 401 path. Verified against @clerk/express 2.x.

**How to apply:** in route tests, drive the user via a request header (e.g.
`x-test-clerk-user`), and pre-seed `users` rows by `clerkUserId` so the JIT
provisioning path (`getOrCreateUserForClerkId`) finds the user locally and
never calls the Clerk API. Also stub `req.log` if route handlers log.
See `artifacts/api-server/src/routes/reviewManagement.test.ts` for a working
example.
