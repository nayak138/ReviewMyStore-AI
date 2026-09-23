---
name: Clerk onboarding invitations
description: Reliable Clerk delivery for local agency-owner and teammate invitations.
---

Use `clerkClient.invitations.createInvitation` for onboarding mail, with `redirectUrl` set to the app's existing local one-time agency or team join URL. Keep the local invitation record as the authorization source of truth, and describe a successful API response as accepted by Clerk rather than inbox-confirmed.

**Why:** Replit-managed Clerk's experimental transactional `emails.create` endpoint can return `404 Resource not found` in the published environment, even though its SDK type is present. The supported instance invitation endpoint requests Clerk's invitation mail and accepts the post-acceptance redirect required by the local invitation flow, but does not provide an inbox-delivery receipt. For external custom domains, Replit documents Clerk email delivery as dependent on the required Publishing-domain CNAME records.

**How to apply:** Send an instance invitation with the recipient email, a remaining expiry duration, `notify: true`, and `ignoreExisting: true`. Treat any custom-domain delivery issue as a DNS configuration check in Publishing → Domains before changing invitation code. Do not replace local tokens, expiry checks, or team-permission grants with Clerk Organization features.