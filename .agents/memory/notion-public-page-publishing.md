---
name: Notion public-page publishing
description: What the Notion API connection can and cannot do for publishing pages publicly.
---

The Notion API can create and edit pages and report a page's `public_url`, but it does not expose the Notion UI's “Publish to web” toggle. Standalone pages remain private until published; child pages of a published Notion Site are published by default unless subpage access is restricted.

**Why:** Notion's help documents that publishing a site includes subpages by default. The API returned public URLs for new child pages under the published 5-STAR.AI DOCS page.

**How to apply:** Check whether the parent Notion Site is published and whether subpages are excluded; then verify each child page's `public_url` or fetch the public URL before claiming it is public. Only ask the owner to publish when the page has no public URL.