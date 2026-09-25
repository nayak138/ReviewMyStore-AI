---
name: Business usage accounting
description: Durable rules for metering agency-plan actions across provider reconnects and slow external requests.
---

Usage allowances belong to the internal business, not to a Google location, Meta Page, provider team, or organization-wide counter. Reconnecting a provider identity must preserve the business's current-period ledger and audit history.

**Why:** Provider identities are replaceable and upstream quotas are independent. Charging the external identity lets reconnects reset allowance or lets one business consume another business's capacity.

**How to apply:** Reserve before a slow provider or AI request, settle accepted work, release failed work, and expose the current business window in business-scoped dashboard responses.

For Meta comment metering, each newly imported comment consumes one daily UTC unit. Its one permitted reply shares that unit when sent the same UTC day; a reply to an older comment consumes a unit on the reply day.

**Why:** The business plan meters a same-day comment-and-reply pair as one unit, not two separate operations.

**How to apply:** Count completed unique imports once, allow their same-day reply without a second reservation, and reserve/settle or release a daily unit for replies to comments imported on an earlier UTC day.