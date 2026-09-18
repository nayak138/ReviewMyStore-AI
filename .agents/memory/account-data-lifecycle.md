---
name: Account data lifecycle
description: Durable privacy decisions for account exports and deactivation requests.
---

Account exports must not persist the JSON payload. Persist only the account-scoped audit metadata, expose a short expiry window, and mark stale issued records expired when a later export is created. Deactivation requests are persistent review records; approval suspends the local account while rejection leaves it active.

**Why:** Account data needs an auditable trail without creating a second long-lived copy of private account content, while deactivation must be reviewable instead of silently changing access.

**How to apply:** Keep future export changes account-scoped and metadata-only. Route account deactivation changes through the administrator review queue and preserve reviewer identity, time, decision, and note.