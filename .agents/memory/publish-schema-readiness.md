---
name: Publish-time schema readiness
description: How to handle managed production schema changes during release readiness checks
---

Production can legitimately lack additive columns or enum values that already exist in the development Drizzle schema until the next Publish applies the managed database diff.

**Why:** The development database and the managed production database are separate, and direct production DDL is not the supported release path.

**How to apply:** Verify development tests against the current schema, inspect production read-only when needed, and leave production migration to the user-approved Publish flow. For read-only dashboards that must survive a lagging schema, explicitly project required columns and cast enum fields to text before filtering; do not add startup DDL or a custom production migration script.

For additive Drizzle bootstraps that must coexist with legacy schema drift, use the names and unique-constraint shape emitted by `drizzle-kit export`; otherwise the next Publish diff can report harmlessly recreated foreign keys or unique indexes as renames.

**Why:** A manually created foreign key or unique index can be semantically correct but structurally different from the Drizzle source, creating avoidable rename prompts during the managed production diff.

**How to apply:** Keep the development-only bootstrap idempotent, align generated constraint/index names with the schema export, and let Publish apply the matching additive objects to production.

When removing a production table with stale incoming foreign keys, Replit's generated diff can emit `DROP TABLE ... CASCADE` before explicit drops for those already-cascaded constraints. Mirror the table in development first, Publish the incoming-constraint removals, then remove the empty development mirror and Publish the table removal separately.

**Why:** The validator rejects the redundant constraint statements even though PostgreSQL would remove them as part of the cascade; separating the dependency cleanup makes each Publish diff executable.

**How to apply:** Confirm the temporary development mirror is empty, never add it back to application source, and use only the normal Publish flow for production changes.