---
name: Marketing SEO prerender
description: How crawler-visible per-route metadata is delivered for the client-rendered marketing site.
---

Client-side rendering and meta updates (document.title / og tags via a hook) are NOT enough for SEO/social tasks because crawlers may not run JavaScript.

**Rule:** every indexable marketing route must bake both its metadata and its rendered React body into route-specific HTML during the production build. Browser startup must hydrate that markup rather than replacing it.

**Why:** social bots, AI crawlers, and some search crawlers only inspect the initial HTML response; an empty root hides headings, copy, and internal links.

**How to apply:** when adding a marketing route or blog post, keep it in the shared indexable route set and metadata map. Build and inspect its generated HTML for a meaningful body, one H1, internal links, title, description, and canonical URL.
