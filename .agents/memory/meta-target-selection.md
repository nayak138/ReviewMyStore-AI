---
name: Meta target selection
description: Safety rules for attaching provider-returned Facebook Pages and Instagram accounts.
---

**Rule:** resolve social targets from the current provider response, require a valid parent identity for Page channels, reject ambiguous IDs, and do not clear the existing channel before the replacement is accepted.

**Why:** provider lists can contain stale, duplicate, or incomplete records; choosing the first match or disconnecting first can attach the wrong Page or leave a business without a working channel.

**How to apply:** keep duplicate targets out of ready/publishable sets, return a recoverable refresh-and-reselect error for missing or ambiguous targets, and preserve Instagram's valid direct-account shape when no channel list is returned.