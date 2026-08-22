# Manual test: Google Business connect flow

Automated coverage (`pnpm --filter @workspace/api-server run test` and
`pnpm --filter @workspace/reviewmystore run test`) exercises the backend
state machine and the two dashboard states, but it mocks bundle.social and
never opens a real browser tab. Real Google OAuth through bundle.social's
hosted portal cannot be scripted (Google requires a live, top-level-window
human sign-in and blocks headless/iframe automation), so the parts of this
flow that touch real Google auth must be checked manually with this script
after any change to the connect flow, the portal redirect, or the
window-focus auto-sync effect.

Relevant files: `src/pages/Reviews.tsx` (client),
`artifacts/api-server/src/services/reviewManagementService.ts` +
`artifacts/api-server/src/routes/reviewManagement.ts` (server).

## Preconditions

- Signed in to the app as an Owner/Admin user of an organization with no
  existing Google connection (`DISCONNECTED`), or one you're willing to
  reset via `DELETE FROM provider_connections WHERE organization_id = '<id>'`.
- `BNDLE_SOCIAL_API` is configured (the "Connect Google Business" button
  returns a "review provider is not configured" error otherwise).
- A Google account with access to a real Google Business Profile.

## Steps

1. Navigate to **Reviews** in the app while viewing it inside the Replit
   preview (an iframe) -- this is the scenario the "open in a new tab" fix
   targets.
2. Click **Connect Google Business**.
   - **Expect:** a *new browser tab* opens to bundle.social's hosted portal.
     The original tab (still showing the app inside the preview iframe)
     does NOT navigate away, and shows a toast: "Complete the connection in
     the new tab."
   - If your browser blocks the popup, expect the fallback: the current tab
     itself navigates to the portal URL (`window.location.href`) instead of
     silently doing nothing.
3. In the new tab, sign in with the Google account and select a Google
   Business location when prompted by the hosted portal.
4. Switch back to the original app tab (click into it, or alt-tab to it).
   - **Expect:** within a moment the page automatically calls sync (the
     window `focus`/`visibilitychange` listener) and the screen transitions
     out of **"Connection Pending"** into the full **Review Inbox** (stat
     cards + review list), without you needing to click anything. Watch the
     Network tab for an automatic `POST /api/review-management/sync` firing
     on refocus.
   - If the automatic sync doesn't fire (e.g. tab focus events are
     suppressed), clicking **"I've connected — Sync now"** on the pending
     screen must produce the same transition.
5. Confirm the connected state persists across a full page reload (no
   Google account needed) and reflects the location you picked in step 3.

## Regression checklist (what a change here must not break)

- [ ] Portal always opens in a new tab/window, never the current iframe.
- [ ] The "Connection Pending" screen appears immediately after starting a
      connection (mirrors `reviewManagementService.test.ts`'s "PENDING, no
      Google account yet" case) and never silently shows stale review data.
- [ ] Refocusing the tab after finishing Google auth auto-syncs and clears
      the pending screen without a manual click.
- [ ] The manual "Sync now" / "Retry Connection" buttons on the pending
      screen still work as a fallback if auto-sync doesn't fire.
- [ ] A connection that syncs successfully shows the CONNECTED Review Inbox
      (mirrors `reviewManagementService.test.ts`'s "CONNECTED" case).
