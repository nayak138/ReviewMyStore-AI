---
name: Replit proxy X-Forwarded-For behavior
description: How client IPs are safely resolved behind Replit's ingress proxy for rate limiting / abuse controls.
---

Replit's ingress proxy fully **overwrites** the `X-Forwarded-For` header with its own verified chain — client-supplied XFF values never reach the app (verified empirically: a spoofed header sent via curl did not appear).

**Why:** This means the header is proxy-authenticated, so `app.set("trust proxy", true)` + `req.ip` in Express yields the real, unspoofable client IP.

**How to apply:** For any per-IP rate limiting or abuse control on this platform, key off `req.ip` with `trust proxy` enabled; never parse XFF manually (a reviewer will reject leftmost-XFF parsing as spoofable, and it's unnecessary here).
