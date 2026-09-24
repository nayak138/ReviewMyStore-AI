---
name: Notion public-page publishing
description: What the Notion API connection can and cannot do for publishing pages publicly.
---

The Notion API can create and edit pages and report a page's `public_url`, but it does not expose the Notion UI's “Publish to web” toggle. A newly created page remains private until an owner publishes it in Notion.

**Why:** The connected API returned `public_url: null` for a new page, and Notion's documented publishing flow uses the page's Share/Publish controls.

**How to apply:** Create the content under an accessible parent, then ask the owner to use Share → Publish in Notion. Do not describe the page as public until a public URL is available.