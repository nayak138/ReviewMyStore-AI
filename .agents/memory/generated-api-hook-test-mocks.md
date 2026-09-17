---
name: Generated API hook test mocks
description: Keeps page-level Vitest mocks aligned with generated API-client hooks.
---

When a page starts using another generated API-client hook, update that page's full module mock in the same change.

**Why:** These tests replace the entire generated client module, so an omitted hook fails at render time even when the production client is correct.

**How to apply:** Search for `vi.mock("@workspace/api-client-react"` in the page tests before adding or renaming a generated hook, and add a minimal return shape for the new hook and its query-key helper.