---
name: Drizzle push and legacy schema drift
description: Why full automatic schema pushes are unsafe until the development QR/NFC drift is reconciled.
---

Drizzle Kit `push --force` still prompts for possible table and column renames, then fails in this project on legacy QR/NFC constraint drift. A table filter combined with the full schema can also misclassify filtered dependencies and enums as missing.

**Why:** Automatic reconciliation attempted unrelated changes and failed on a foreign-key name that does not exist. Treating rename guesses as authoritative could destroy or misassign legacy data.

**How to apply:** Until the legacy drift is deliberately reconciled, use narrowly scoped, idempotent schema bootstraps for urgent additive tables. Never auto-select rename guesses or run a full forced push against production.