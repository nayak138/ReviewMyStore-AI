---
name: Marketing SEO prerender
description: How crawler-visible per-route metadata is delivered for the client-rendered marketing site.
---

Client-side meta updates (document.title / og tags via a hook) are NOT enough for SEO/social tasks — completion review rejects them because crawlers don't run JS.

**Rule:** any per-route metadata for the web marketing site must also be baked into the HTML: the vite config has an `seoFilesPlugin` that (a) serves/emits sitemap.xml + robots.txt, (b) injects route meta into index.html per request in dev via `transformIndexHtml`, and (c) prerenders `dist/public/<route>/index.html` per marketing route at build time from a shared route-meta module.

**Why:** the site is a client-rendered SPA; social bots and many crawlers only see the static shell.

**How to apply:** when adding a marketing route or blog post, ensure it's covered by the shared route-meta map (blog posts are picked up automatically from blog-data). Canonical site URL lives in one constant, overridable via `VITE_SITE_URL`; verify it matches the production domain after publishing.
