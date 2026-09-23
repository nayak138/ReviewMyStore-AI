# Auth session-expiry smoke test

The browser smoke test in
`src/auth/SessionExpiryWatcher.browser.test.tsx` verifies the security-critical
transition that cannot be driven reliably with a production Clerk account:

1. It seeds a signed-in protected-page fixture with representative private
   React Query data.
2. It simulates Clerk's refreshed token becoming empty while the page is
   active.
3. It confirms that the private query cache is cleared, protected content is
   removed, and the sign-out redirect includes the encoded current return path
   plus the expired-session marker.

Run it with:

```sh
pnpm --filter @workspace/reviewmystore run test:browser
```

The fixture mocks Clerk and does not use production credentials, sessions, or
API data. The test runs in the configured Chromium browser instances.

This complements the published-app check rather than replacing it. The
published check verifies that an unauthenticated visit does not expose cached
dashboard data in the deployed app. This smoke test verifies the in-place
session-loss transition: an already-rendered private page must stop showing
private data and send the user to sign-in with the page they were viewing
encoded as the return path. It does not claim to test Clerk's production token
revocation or the live sign-in provider.