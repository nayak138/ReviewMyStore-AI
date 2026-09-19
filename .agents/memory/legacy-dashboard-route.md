---
name: Legacy dashboard URL
description: Compatibility rule for the authenticated app's historical post-sign-in path
---

Keep `/dashboard` as a client-side compatibility redirect to the current authenticated home route. Do not assume Clerk settings or existing bookmarks have migrated when the app's internal home route changes.

**Why:** A deployed sign-in flow or an older bookmark can still target `/dashboard`; without the alias, users see a 404 even though the authenticated app and API are healthy.

**How to apply:** Preserve the alias in the main router whenever the canonical authenticated home path changes, and verify both direct navigation and post-sign-in navigation.