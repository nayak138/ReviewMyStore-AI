---
name: Publish-time schema readiness
description: How to handle managed production schema changes during release readiness checks
---

Production can legitimately lack additive columns that already exist in the development Drizzle schema until the next Publish applies the managed database diff.

**Why:** The development database and the managed production database are separate, and direct production DDL is not the supported release path.

**How to apply:** Verify development tests against the current schema, inspect production read-only when needed, and leave production migration to the user-approved Publish flow. Do not add startup DDL or a custom production migration script.