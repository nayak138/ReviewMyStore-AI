---
name: Clerk dev-mode Google consent screen branding
description: Why the "Continue with Google" consent screen shows an unexpected org/app name in Development, and what can (and can't) fix it.
---

# Clerk dev-mode Google consent screen branding

In Replit-managed Clerk, the Google OAuth consent screen shown by "Continue
with Google" during sign-in is controlled by the OAuth application registered
with Google — not by anything in the app's own code, the Clerk instance name,
or `replit.md`/branding assets. In the **Development** environment this is a
shared Clerk-provided OAuth app, so the name Google displays can look like a
generic/default value (e.g. an auto-generated "<Name>'s Organisation" string)
that has nothing to do with the product's actual branding.

**Why:** confirmed via Replit docs search — "the app name and branding
displayed on a social provider's OAuth consent screen are determined by the
OAuth application registered with that provider, not by the branding
configured in your Replit/Clerk Auth tool." Custom Google OAuth credentials
(your own Google Cloud OAuth client, with your own registered app name/logo)
are configurable from the Auth pane → Configure tab → SSO providers, but
**only for the Production environment** — Development cannot use custom
credentials at all, so this branding is simply unfixable in dev.

**How to apply:** if a user reports an unexpected name/org showing up on a
Google sign-in popup, first check whether it's actually the *review-connect*
OAuth flow (a different, provider-specific integration, e.g. bundle.social)
before assuming it's Clerk's own login. If it is Clerk's "Continue with
Google", explain this is a Development-only limitation and point them to the
Auth pane to set up custom Google OAuth credentials once they're ready for
Production — don't attempt a code fix, there isn't one.
