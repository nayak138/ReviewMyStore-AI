---
name: Video artifact promotion
description: What must be preserved when moving a video composition into a registered video-js artifact
---

When promoting a video composition into a registered video-js artifact, copy scene/UI source and assets without overwriting the registered package's canonical recording lifecycle hook or artifact manifest.

**Why:** The export renderer depends on lifecycle markers and total-duration metadata that may not exist in a standalone composition's simpler hook; replacing it can leave the preview visually working while export fails.

**How to apply:** Preserve `.replit-artifact/artifact.toml` and restore/validate the registered package's lifecycle hook after any source transfer. Run the recording validator, production build, and a fresh 16:9 preview before presenting.