---
name: Zernio (BNDLE) API key validity
description: How to recognize an invalid Zernio API key vs a disconnected Google account in the review-management provider
---

# Zernio (BNDLE) API key validity

Valid Zernio API keys are `sk_` + 64 hex characters (67 chars total). Auth is `Authorization: Bearer <key>` against base `https://zernio.com/api` (endpoints under `/v1/...`).

**Why:** The workspace secret `BNDLE_SOCIAL_API` once held a 36-character UUID-style value that Zernio rejected with 401 `{"error":"Unauthorized"}` on every endpoint, which the review provider service initially misreported as "reconnect your Google Business". The user was asked for a real key and declined (Aug 21, 2026) — the review connection flow stays blocked until a valid `sk_` key is saved.

**How to apply:** A 401 from Zernio means OUR platform API key is bad (surface as provider-not-configured, 503); a disconnected end-user Google account surfaces as `token_invalid` / `token_expired` codes in the response body instead. Before debugging the review connection flow, check the key length/prefix (never print the value) with a shell probe.
