---
name: Object upload visibility boundary
description: Durable rules for object ACL defaults and public branding compatibility.
---

Generic object uploads must be finalized by the authenticated uploader and receive a private owner ACL by default. Branding images are an explicit exception because public review pages need them; they are served through a dedicated route that requires a public ACL, with a narrow legacy fallback only when the path is currently referenced by an active business logo or cover.

**Why:** Protecting the private object route must not either expose arbitrary known paths or break existing customer-facing branding images.

**How to apply:** Keep public branding paths separate from authenticated private reads, never treat an object path as ownership proof, and do not broaden the legacy fallback to arbitrary objects.