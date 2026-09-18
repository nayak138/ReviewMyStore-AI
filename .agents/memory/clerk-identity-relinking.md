---
name: Clerk identity relinking
description: Boundary between safe super-admin identity migration and invitation-based owner provisioning
---

Only an email in the explicit `SUPER_ADMIN_EMAILS` allowlist may relink an existing local user row to a new Clerk user ID by verified primary email. Preserve that row's local organization and role during the relink.

**Why:** Clerk user IDs can change across environments, but allowing every new Clerk identity to claim an existing email would bypass the one-time agency invitation rule and could attach a second owner to an existing account.

**How to apply:** Keep ordinary owners on the invitation path. Use the allowlist as the deliberate migration signal, and serialize the relink by normalized email plus Clerk ID.