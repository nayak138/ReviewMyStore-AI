---
name: bundle.social (BNDLE) review provider API
description: Correct provider, auth, and error semantics for the Google review integration behind BNDLE_SOCIAL_API
---

# bundle.social (BNDLE) review provider API

The review provider behind the `BNDLE_SOCIAL_API` secret is **bundle.social** (docs: https://info.bundle.social), NOT Zernio. An earlier build wired the integration to Zernio's API by mistake and every call failed with 401 even though the user's key was valid the whole time.

**Facts:**
- Base URL `https://api.bundle.social`, all endpoints under `/api/v1`.
- Auth header is `x-api-key` (not `Authorization: Bearer`). Keys are UUID-format.
- 401 = key missing/rejected, 403 = also always OUR platform credential/account (never the end user's Google connection) but bundle.social overloads 403 for other reasons too — e.g. `POST /team/` 403s with body `{"message":"Social sets limit reached. Limit is 3 sets."}` when the whole account (shared across every local organization/tenant) hits its plan's team cap. Don't assume every 403 means "invalid key" — read `payload.message` and surface it.
- Team quota is account-wide, not per-tenant: as of 2026-08-22 the plan in use here caps at 3 teams total across ALL ReviewMyStore organizations combined. Stale teams from dev/testing count against this — list with `GET /team/` and delete unused ones with `DELETE /team/{id}` before assuming a real quota upgrade is needed.
- Hierarchy: Organization → Teams → Social Accounts. One bundle.social team per local organization keeps tenants isolated.
- Google Business connect now uses the **custom UI flow** (`POST /social-account/connect` → real Google OAuth URL, our own callback + location picker), not the hosted portal — see `bundle-social-portal-white-label.md` for why/how this superseded `create-portal-link`.
- The OAuth `client_id` used by `social-account/connect` belongs to bundle.social's own Google Cloud project — there is no API field to rebrand what Google's consent screen shows (app name/logo). That branding is entirely out of reach unless bundle.social ever exposes a "bring your own OAuth app" option.
- `social-account/connect` 400s with `"This team already has a Google Business Profile connected. Please disconnect it first."` if a GOOGLE_BUSINESS account already exists for that team (e.g. local "disconnect" only flipped our own DB status without calling bundle.social's real `DELETE /social-account/disconnect`, so their side still thinks it's connected). Always call `GET /social-account/by-type` first and, if an account already exists, resolve/reuse its current stage (see `resolveLocationStage` pattern) instead of calling `connect` again — don't let this surface as a generic "failed to start connection" error.
- Review import is an async job: `POST /misc/google-business/reviews/import {teamId,count}` (409 = already running; monthly per-account caps apply — Free plan is 5 reviews/month), poll `GET .../import?teamId=`, then page `GET .../reviews?teamId=`.
- Replies: `PUT/DELETE /misc/google-business/reviews/:reviewId/reply` with `teamId` in the JSON body (yes, DELETE takes a body).

**How to apply:** When debugging this integration, verify against these endpoints/headers before suspecting the user's key. Never store or print the key; probe with shell using the env var.
