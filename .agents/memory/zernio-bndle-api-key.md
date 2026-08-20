---
name: bundle.social (BNDLE) review provider API
description: Correct provider, auth, and error semantics for the Google review integration behind BNDLE_SOCIAL_API
---

# bundle.social (BNDLE) review provider API

The review provider behind the `BNDLE_SOCIAL_API` secret is **bundle.social** (docs: https://info.bundle.social), NOT Zernio. An earlier build wired the integration to Zernio's API by mistake and every call failed with 401 even though the user's key was valid the whole time.

**Facts:**
- Base URL `https://api.bundle.social`, all endpoints under `/api/v1`.
- Auth header is `x-api-key` (not `Authorization: Bearer`). Keys are UUID-format.
- 401 = key missing, 403 = key invalid — both mean OUR platform credential, never the end user's Google connection.
- Hierarchy: Organization → Teams → Social Accounts. One bundle.social team per local organization keeps tenants isolated.
- Google Business connect uses the hosted portal: `POST /api/v1/social-account/create-portal-link` with `socialAccountTypes: ["GOOGLE_BUSINESS"]`; the portal handles OAuth + location selection.
- Review import is an async job: `POST /misc/google-business/reviews/import {teamId,count}` (409 = already running; monthly per-account caps apply — Free plan is 5 reviews/month), poll `GET .../import?teamId=`, then page `GET .../reviews?teamId=`.
- Replies: `PUT/DELETE /misc/google-business/reviews/:reviewId/reply` with `teamId` in the JSON body (yes, DELETE takes a body).

**How to apply:** When debugging this integration, verify against these endpoints/headers before suspecting the user's key. Never store or print the key; probe with shell using the env var.
