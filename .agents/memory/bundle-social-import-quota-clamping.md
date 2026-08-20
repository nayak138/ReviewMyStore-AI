---
name: bundle.social review import quota is not auto-clamped
description: A fixed import batch count silently imports zero reviews once monthly quota is below that count; must parse the error and retry with the actual remaining amount.
---

# bundle.social review import quota is not auto-clamped

`POST /misc/google-business/reviews/import` rejects the entire request with
HTTP 400 if `count` exceeds the social account's remaining monthly quota —
it does not clamp to what's available. A hardcoded batch size (e.g. 50)
means once remaining quota drops below that size, every import attempt
fails outright and zero new reviews ever get imported, even though some
quota remains. This surfaced as a dashboard showing "0 reviews" while the
UI's own quota banner said "5 imports left" — the fixed count silently
failed instead of importing those 5.

bundle.social returns two different 400 message shapes depending on state:
- Partial quota left: `"Requested N reviews but only M remaining in this
  social account's monthly limit. Used: X/Y."`
- Quota fully exhausted: `"... has reached its monthly review import limit
  of N reviews. Used: N/N. The limit resets at the beginning of each
  month."`

**How to apply:** On a 400 from this endpoint, parse the actual remaining
count out of the error message and retry once with that count instead of
just reporting failure. Treat "reached its monthly ... limit" as remaining
= 0 (genuinely exhausted, not a bug). Never assume a fixed batch size is
safe for a quota-limited endpoint without confirming it clamps server-side.
