---
name: Clerk branding replacement
description: Replit-managed Clerk branding editor behavior when replacing an existing logo
---

Use Clerk’s **Replace image** action to change an existing logo. Do not remove the current logo first.

**Why:** The destructive Remove flow can show “Current user is missing an organization permission” even when Replit reports authorized access to the managed Clerk dashboard. Removing the logo is also permanent.

**How to apply:** Cancel the Remove dialog, open Replace image, upload the replacement logo, and leave the Favicon section unchanged. If Replace image itself fails with the same permission message, the blocker is dashboard authorization rather than the asset or application code.