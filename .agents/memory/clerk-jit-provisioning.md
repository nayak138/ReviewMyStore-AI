---
name: Clerk JIT provisioning + SUPER_ADMIN
description: How local User/Organization records relate to Clerk identities, and how the SUPER_ADMIN role is scoped.
---

Local `User`/`Organization` rows are just-in-time provisioned from the Clerk identity on first authenticated request, rather than via a webhook-driven sync. A `SUPER_ADMIN` role exists as a platform-level role and is granted via an allowlist rather than through organization membership, so a SUPER_ADMIN user has no `organizationId`.

**Why:** keeps auth simple for an early-stage app without needing to stand up Clerk webhooks yet; SUPER_ADMIN is a platform concern (support/ops), not a tenant concern.

**How to apply:** any route/service that is scoped to an Organization (e.g. Business CRUD) should require `req.appUser.organizationId` and return 403 for callers without one, including SUPER_ADMIN — this is a deliberate, unilateral design choice (business management is an Owner/tenant concern) that should be mentioned transparently to the user rather than assumed. If the user wants SUPER_ADMIN to manage all orgs' businesses later, that needs a distinct "impersonate org" or admin-scoped endpoint, not a relaxation of the tenant check.
