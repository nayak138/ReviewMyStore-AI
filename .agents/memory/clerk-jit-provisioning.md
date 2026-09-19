---
name: Clerk JIT provisioning + SUPER_ADMIN
description: How local User/Organization records relate to Clerk identities, and how the SUPER_ADMIN role is scoped.
---

Local `User`/`Organization` rows are just-in-time provisioned from the Clerk identity on first authenticated request, rather than via a webhook-driven sync. A `SUPER_ADMIN` role exists as a platform-level role and is granted via an allowlist rather than through organization membership, so a SUPER_ADMIN user has no `organizationId`.

**Why:** keeps auth simple for an early-stage app without needing to stand up Clerk webhooks yet; SUPER_ADMIN is a platform concern (support/ops), not a tenant concern.

**How to apply:** any route/service that is scoped to an Organization (e.g. Business CRUD) should require `req.appUser.organizationId` and return 403 for callers without one, including SUPER_ADMIN — this is a deliberate, unilateral design choice (business management is an Owner/tenant concern) that should be mentioned transparently to the user rather than assumed. If the user wants SUPER_ADMIN to manage all orgs' businesses later, that needs a distinct "impersonate org" or admin-scoped endpoint, not a relaxation of the tenant check.

When Clerk replaces a subject for an email on the super-admin allowlist, reconcile it to any existing local account for that normalized email, preserving the local role and organization. Do not use this email-based path for ordinary owner emails.

**Why:** An existing tenant owner can legitimately have an email that is later added to the allowlist; inserting a new SUPER_ADMIN row would fail or silently change access semantics. Broad email reconciliation would still let a second Clerk subject reuse an accepted invitation.

**How to apply:** only perform the email lookup inside the allowlisted branch and preserve role, organization, status, and preferences. For non-allowlisted owners, require the existing Clerk subject or the normal active-invitation flow.

For agency onboarding, first-login JIT provisioning must require a matching active invitation for non-SUPER_ADMIN users, attach the new owner to the invitation's pre-created organization, and consume the invitation in the same transaction. Public signup must not be able to create an uninvited organization.

**Why:** the platform is invitation-only after moving to a B2B agency model; falling back to creating an organization silently reopens public signup and can place an owner in the wrong tenant.

**How to apply:** keep invitation tokens hashed and one-time; validate email, expiry, invitation status, and target organization status before provisioning. Existing users still use the normal lookup path.
