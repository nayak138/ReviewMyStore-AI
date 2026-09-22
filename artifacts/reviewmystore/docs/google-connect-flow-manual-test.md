# Manual test: Google and Meta OAuth cancellation recovery

Automated coverage (`pnpm --filter @workspace/api-server run test` and
`pnpm --filter @workspace/reviewmystore run test`) exercises the provider state
machines and callback recovery, but it does not open a real top-level browser
window. Google and Meta require a human sign-in/consent window, so use this
procedure for the published workspace after changing an OAuth start request,
callback URL, or browser-tab handoff.

Relevant files:

- `src/pages/Reviews.tsx` — Google Business callback and pending states
- `src/pages/SocialMedia.tsx` — Meta callback recovery and account selection
- `artifacts/api-server/src/services/reviewManagementService.ts`
- `artifacts/api-server/src/services/socialMediaService.ts`

## QA browser profile and privacy rules

Use a fresh, temporary browser profile for every run. The profile is a
repeatable signed-in browser session, not a place to store private session
data.

1. Create a temporary Chrome, Edge, or Firefox profile named for the test run.
   Do not use a personal profile.
2. Open the current **published workspace URL** in that profile, sign in
   manually as a QA Owner/Admin, and select a business that the test account
   is allowed to manage.
3. Do not save the password, export cookies, copy the Clerk session, record
   OAuth URLs, or take screenshots of Google/Meta account details. Do not put
   credentials, access tokens, or private callback URLs in a bug report.
4. Close every provider tab and delete the temporary profile when the run is
   complete. If a provider account was connected during a success check,
   detach/disconnect it through the app or the approved QA reset process
   before deleting the profile.

The published app must have `BNDLE_SOCIAL_API` configured. Headless browser
automation and the Replit preview iframe are not substitutes for this test:
the provider tab must be a real top-level window.

## Workspace navigation check

From the published business workspace, confirm both links keep the same
business context:

- **Review Inbox** opens `/reviews?businessId=<selected-business>...`
- **Social Media** opens `/social-media?businessId=<selected-business>...`

The page header and workspace tabs must identify the selected business. Do not
start either provider flow from a different business, a bare legacy URL, or a
different browser profile.

## Google cancel and denial

Start with a QA business whose Google connection is not already connected. If
the provider has a stale Google account for the QA team, use the approved
non-destructive QA reset or disconnect path before repeating the test.

1. Open **Review Inbox** from that business workspace.
2. Click **Connect Google Business**.
   - **Expect:** the app stays in the original tab and shows a toast telling
     you to complete the connection in a new tab.
   - If the browser blocks the popup, the current tab may navigate to the
     provider URL as the documented fallback.
3. In the new top-level Google tab, run one of these cases:
   - **Cancel:** back out of the Google consent flow without granting access.
   - **Denial:** reach the consent screen and choose the option that denies
     access.
4. **Expect after the provider returns to the app:** the callback tab is still
   tied to the originally selected business, shows **Connection wasn't
   completed**, and offers **Try again**. It must not show a Google connected
   toast, review stats, or the full **Review Inbox**.
5. Confirm the original workspace remains on the same business. Close the
   callback tab, reopen **Review Inbox** from the business tabs if needed, and
   confirm it still shows the disconnected/connect state rather than a false
   success state.
6. Click **Try again**, start a second connection, and confirm a new provider
   tab opens. This verifies retry recovery without changing businesses.

For a successful-path sanity check, grant access and select a location only
after the cancel/denial checks pass. The callback should then show the
location picker or finish syncing, and the Review Inbox should only appear
after the connection is actually ready.

## Meta cancel and denial

Start with a QA business that has no attached Facebook or Instagram account.
Instagram uses Meta/Facebook authorization, so test both labels through the
same Meta sign-in flow where the UI offers them.

1. Open **Social Media** from the same business workspace.
2. In **Add a channel**, click **Connect** for Facebook, then run the
   following cases in separate attempts:
   - **Cancel:** close or back out of the Meta authorization flow.
   - **Denial:** choose the Meta option to decline requested permissions.
3. **Expect after each return:** the app returns to the requested business and
   shows **Social authorization wasn't completed** with **No account was
   connected**. The connected-channels list must remain unchanged, and there
   must be no **Social account authorized** success toast.
4. Repeat steps 2–3 for Instagram if Instagram authorization is part of the
   release under test. Confirm the same no-account result.
5. Click **Connect** again from the same business. A new top-level provider tab
   must open, and the page must still be scoped to the original business.
6. For a successful-path sanity check, grant access, return to the app, and
   confirm the account-selection prompt lists available Page/account choices
   before attaching one to the business.

## Regression checklist

- [ ] A signed-in QA Owner/Admin can open both Review Inbox and Social Media
      from the published business workspace.
- [ ] Google opens in a top-level tab and preserves the requested business on
      cancel, denial, retry, and success.
- [ ] Google cancel/denial shows **Connection wasn't completed**, not a
      connected state or Review Inbox.
- [ ] Meta opens in a top-level tab and preserves the requested business on
      cancel, denial, retry, and success.
- [ ] Meta cancel/denial shows **Social authorization wasn't completed**, does
      not attach an account, and does not show a success toast.
- [ ] Retrying either provider opens a fresh authorization attempt for the
      same business.
- [ ] No credentials, access tokens, cookies, session exports, or provider
      account details are stored in the browser profile after the run.
