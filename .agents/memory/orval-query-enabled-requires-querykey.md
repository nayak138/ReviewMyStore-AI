---
name: Orval query hooks require explicit queryKey when using `enabled`
description: TS error "Property 'queryKey' is missing" when passing `{ query: { enabled } }` to a generated useXxx query hook in this project's Orval setup.
---

In this project's Orval-generated React Query hooks, the `query` options object's TypeScript type does **not** default `queryKey` to the hook's own key — if you pass `{ query: { enabled: someBool } }` alone, `tsc` fails with `Property 'queryKey' is missing`.

**Why:** the generated `UseQueryOptions` type for each hook requires `queryKey` explicitly; there's no optional default in the type signature even though the hook internally falls back to `getXxxQueryKey(...)` at runtime when omitted.

**How to apply:** whenever passing a `query` options object (most commonly to add `enabled`) to any generated `useXxx` hook, also import and pass the matching `getXxxQueryKey(...)` helper (exported alongside the hook from the same generated module), e.g.:
```ts
useGetPlaceDetails(placeId, {
  query: { enabled: !!placeId, queryKey: getGetPlaceDetailsQueryKey(placeId) },
});
```
This applies to `useListBusinesses`, `useListCampaignTemplates`, `useGetPlaceDetails`, `useAutocompletePlaces`, `useGetPublicReviewPage`, and any other generated query hook — check for this whenever adding `enabled` (or any other query option) to a generated hook call.
