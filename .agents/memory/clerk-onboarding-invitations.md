---
name: Clerk onboarding invitations
description: Reliable Clerk delivery for local agency-owner and teammate invitations.
---

Use `clerkClient.invitations.createInvitation` for onboarding mail, with `redirectUrl` set to the app's existing local one-time agency or team join URL. Keep the local invitation record as the authorization source of truth.

**Why:** Replit-managed Clerk's experimental transactional `emails.create` endpoint can return `404 Resource not found` in the published environment, even though its SDK type is present. The supported instance invitation endpoint sends Clerk's invitation mail and accepts the post-acceptance redirect required by the local invitation flow.

**How to apply:** Send an instance invitation with the recipient email, a remaining expiry duration, `notify: true`, and `ignoreExisting: true`. Do not replace local tokens, expiry checks, or team-permission grants with Clerk Organization features.