---
name: AI generation reservation accounting
description: Durable concurrency rule for public AI generation quota and session caps.
---

Public AI generation must reserve quota and session capacity with a unique durable request record before calling the provider. The record is finalized only after successful generation; failures transition only their own pending reservation to failed and compensate the counters with guarded SQL arithmetic.

**Why:** Provider calls happen outside the database transaction, so a plain decrement/increment pair can roll back a concurrent request or permanently consume a customer's attempt when the provider fails.

**How to apply:** Preserve the campaign binding and atomic `< max`/`> 0` guards, use request-specific state for compensation, and keep counter updates relative (`+ 1`, `- 1`, `GREATEST`) rather than writing stale read values.