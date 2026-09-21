---
name: OAuth callback public host
description: OAuth and provider asset callbacks must use the host visible to the browser, not workspace domain environment variables
---

OAuth callback URLs and provider-facing asset URLs must be built from the incoming request's forwarded public host and protocol. Workspace domain environment variables identify development infrastructure and can send a production authorization flow back to the wrong host, where the user's session is unavailable.

**Why:** A published OAuth flow can complete successfully at the workspace domain while the user's authenticated session exists on the published domain, which looks like a sign-in or landing-page redirect failure.

**How to apply:** For server operations initiated by the browser, derive the public origin from the trusted forwarded host/protocol and pass it into provider URL generation. Keep environment-based origin helpers only as a fallback for non-requested background/test calls.