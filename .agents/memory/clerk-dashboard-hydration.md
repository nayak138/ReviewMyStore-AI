---
name: Clerk dashboard hydration
description: Authenticated page loading behavior immediately after Clerk sign-in
---

Protected dashboard queries must wait for Clerk `isLoaded && isSignedIn`, and protected pages must render an explicit loading state while Clerk resolves. Initial sign-in navigation can happen before session-backed API requests are ready.

**Why:** Returning `null` during Clerk hydration makes the dashboard appear blank, while a first unauthenticated request can leave a query stale until the user manually refreshes.

**How to apply:** Gate the query with the full Clerk readiness condition, refetch on mount, retry transient initial failures, and render a recoverable error state instead of treating missing data as an empty account.