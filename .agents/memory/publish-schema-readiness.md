---
name: Publish-time schema readiness
description: How to handle managed production schema changes during release readiness checks
---

Production can legitimately lack additive columns that already exist in the development Drizzle schema until the next Publish applies the managed database diff.

**Why:** The development database and the managed production database are separate, and direct production DDL is not the supported release path.

**How to apply:** Verify development tests against the current schema, inspect production read-only when needed, and leave production migration to the user-approved Publish flow. Do not add startup DDL or a custom production migration script.

When removing a production table with stale incoming foreign keys, Replit's generated diff can emit `DROP TABLE ... CASCADE` before explicit drops for those already-cascaded constraints. Mirror the table in development first, Publish the incoming-constraint removals, then remove the empty development mirror and Publish the table removal separately.

**Why:** The validator rejects the redundant constraint statements even though PostgreSQL would remove them as part of the cascade; separating the dependency cleanup makes each Publish diff executable.

**How to apply:** Confirm the temporary development mirror is empty, never add it back to application source, and use only the normal Publish flow for production changes.