---
name: Clerk transactional email verification
description: Verification boundary for custom emails sent through Clerk's Backend SDK
---

Clerk's Backend SDK `emails.create` is an experimental internal endpoint. A development Clerk instance may return HTTP 404 even when the SDK method and payload are valid, so mocked provider tests only prove payload wiring, not delivery.

**Why:** the endpoint is not guaranteed to be available in every Clerk environment, and the development response can look like an application failure even though production is configured separately.

**How to apply:** keep automated tests focused on sender, recipient, content, and failure handling; verify an invitation and each alert type with a controlled recipient from the published production app before claiming inbox delivery.