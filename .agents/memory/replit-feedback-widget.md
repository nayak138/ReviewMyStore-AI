---
name: Replit feedback widget
description: The published-app feedback widget is injected by Replit, not the app bundle.
---

The Replit “Share your feedback” panel and corner badge are controlled by the Publishing setting “Enable feedback widget”; they do not come from application source or the Replit Vite development plugins.

**Why:** A source search can show no widget code while the control still appears after publishing because the platform adds it outside the app bundle.

**How to apply:** Turn the setting off, republish, then hard-refresh or use a private window. If it remains on the clean published URL, treat it as a Replit publish/cache or account-setting issue rather than an app-code issue.