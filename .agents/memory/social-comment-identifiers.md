---
name: Social comment identifiers
description: bundle.social distinguishes stored fetched-comment IDs from platform comment IDs when replying
---

bundle.social comment imports return both a stored fetched-comment `id` and a platform `externalId`. Reply requests must use the stored fetched-comment `id` as `fetchedParentCommentId`.

**Why:** The provider accepts the import but rejects replies addressed with the platform ID as “fetched comment not found or does not belong to this team.”

**How to apply:** Preserve both identifiers in the API contract; use `id` for reply mutations and `externalId` only for platform/thread display or hierarchy.