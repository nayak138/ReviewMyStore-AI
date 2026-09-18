---
name: Provider operation leases
description: Concurrency control for organization-scoped third-party review-provider mutations.
---

**Rule:** coordinate review-provider mutations with a durable, organization-scoped database lease that has an owner token, expiry, and periodic renewal. Never hold a PostgreSQL session advisory lock while waiting on an upstream provider.

**Why:** session advisory locks reserve a shared application-pool connection for the full duration of slow network work, which can exhaust the pool. A durable expiry also lets a later request recover after a process crash; the owner token stops a previous holder from releasing a newer lease.

**How to apply:** use an atomic expired-or-absent claim, renew only when the token still matches, and delete only the matching token in cleanup. Keep the lease duration safely longer than all bounded upstream calls, so a temporary renewal failure cannot create concurrent mutations.