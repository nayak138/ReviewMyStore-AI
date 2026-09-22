---
name: Business usage accounting
description: Durable rules for metering agency-plan actions across provider reconnects and slow external requests.
---

Usage allowances belong to the internal business, not to a Google location, Meta Page, provider team, or organization-wide counter. Reconnecting a provider identity must preserve the business's current-period ledger and audit history.

**Why:** Provider identities are replaceable and upstream quotas are independent. Charging the external identity lets reconnects reset allowance or lets one business consume another business's capacity.

**How to apply:** Reserve before a slow provider or AI request, settle accepted work, release failed work, and expose the current business window in business-scoped dashboard responses.