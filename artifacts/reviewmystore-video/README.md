# ReviewMyStore.ai Product Video

## Direction

**Google-inspired kinetic editorial** — a warm paper canvas, oversized type, four-color brand accents, and product-interface closeups. The motion language is a continuous camera move: clip-path reveals and a persistent orbiting ring connect the beats rather than treating scenes as slides.

- **Canvas:** fixed 16:9 composition, filled by the viewport
- **Fonts:** Plus Jakarta Sans + DM Mono
- **Palette:** paper `#f8f6f0`, ink `#202124`, Google blue `#2f6fed`, red `#ea4335`, yellow `#fbbc04`, green `#34a853`
- **Motion system:** `circOut`-style reveal easing, spring accents for stars/tags, drifting background shapes, animated SVG chart path, and `AnimatePresence mode="sync"` scene overlap

## Story beats

1. Good service deserves to be visible.
2. Find the correct business.
3. Give happy customers a QR or short-link path while the moment is fresh.
4. Use AI to draft a specific review while the owner stays in control.
5. Watch reviews, response time, and reputation trend upward.

The video is intentionally non-interactive: it auto-plays, loops, has no controls, and includes only visual UI mockups.

## Run and build

```bash
pnpm --filter @workspace/reviewmystore-video run dev
pnpm --filter @workspace/reviewmystore-video run typecheck
pnpm --filter @workspace/reviewmystore-video run build
```

The managed artifact workflow is declared in `.replit-artifact/artifact.toml` on port `25505`. The persisted authoritative ratio is `[video].videoAspectRatio = "16:9"`.

Brand assets are copied from the product artifact and referenced at runtime with `import.meta.env.BASE_URL`:

- `public/brand/logo-horizontal.png`
- `public/brand/logo-horizontal-dark.png`
- `public/brand/logo-icon.png`