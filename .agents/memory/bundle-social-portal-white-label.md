---
name: bundle.social hosted portal white-labeling
description: How to remove bundle.social's own branding from the hosted connect portal page (the one opened via create-portal-link).
---

# White-labeling the hosted connect portal

`POST /social-account/create-portal-link` accepts hosted-UI fields that fully
white-label the page bundle.social renders at `bundle.social/connect`:
`hidePoweredBy`, `hideLanguageSwitcher`, `hideGoBackButton`, `hideUserLogo`,
`hideUserName`, plus `logoUrl` / `userLogoUrl` / `userName` to show our own
branding instead. No separate plan tier or account setting is required — it's
just request body fields on the existing endpoint.

**Why:** the hosted portal is entirely rendered by bundle.social (opened via
`window.open`, not our own code), so it can't be restyled with our CSS. The
default page shows a "Powered by bundle.social" footer and their logo, which
looked broken/unbranded to end users. There's also a lower-level "Custom UI
Flow" (`POST /social-account/connect` + handling the OAuth callback and
channel/location selection ourselves) that removes bundle.social's UI
entirely, but it's substantially more engineering (own callback handling,
own location picker) — the hosted-flow branding fields solve the actual
complaint with a one-line payload change.

**How to apply:** when calling `create-portal-link`, pass `hidePoweredBy: true`,
`hideLanguageSwitcher: true`, a `logoUrl` pointing at a publicly reachable
HTTPS asset (derive the origin from `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN`, not
the request's `Referer`, since the logo needs a stable URL independent of
where the request came from), and `userName` set to the organization's name.
Verified live against the real API: the returned portal page dropped the
"Powered by" bar and language switcher and showed the org name instead.
