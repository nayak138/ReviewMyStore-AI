# 5-Star.AI landing page and demo — approval draft

**Status:** Planning only. Application code, backend contracts, authentication, data, and deployment are unchanged. Implementation and regression verification below require approval; they have not been performed.

## 1. Direction

Polish the existing product experience rather than redesigning the product. Keep the logo, DM Sans body text, Fraunces editorial headings, rounded cards, thin borders, restrained purple/blue accents, and generous spacing. Use the requested dark navy/black environment on the homepage without changing authenticated screens or their theme preference.

The brief’s examples are subordinate to the supplied final page order, exact headline, “No Sign Up” requirement, existing commercial policy, and verified product capabilities.

### Proposed above-the-fold copy

**H1: Your reputation deserves a system.**

5-Star.AI helps local businesses, agencies, and multi-location teams invite genuine Google reviews, manage feedback, and draft thoughtful replies. Customers keep control of their final words.

**Primary:** Start 7-Day Free Trial  
**Secondary:** See How It Works

**7-Day Free Trial · No Credit Card · No Sign Up**

Request a guided trial without creating a 5-Star.AI account. Share your contact details and our team will follow up to arrange setup.

The live customer experience follows immediately, not after a large decorative dashboard image.

## 2. Current baseline and findings

Read-only inspection covered the supplied brief, marketing composition, demo and lead routes, actual product screens/services, public usage docs, and build-time rendering. Baseline captures:

- [Desktop, 1440px](baseline-desktop.jpg)
- [Mobile, 320px](baseline-mobile-320.jpg)

These are the **existing page**, not proposed designs. Both previews rendered with no application errors in the screenshot browser logs. The screenshots are not an interaction test or a full-page audit.

| Finding | Proposed treatment |
| --- | --- |
| `Marketing.tsx` starts with `InteractiveReviewDemo`; the separate `HeroSection` is unused. | Reuse the hero’s editorial structure, remove its competing illustrative desk visual, and mount one concise hero before the existing demo. Move the demo heading to H2. |
| The current system-theme preview is light, although dark tokens and dark variants exist. | Apply the requested dark direction locally to the homepage. Do not change the app’s global theme provider, saved preference, or authenticated styles. Account for dialog/popover portals explicitly. |
| At 320px, the demo visibly clips its right side, including language and contact controls. | Fix intrinsic widths, nested padding, heading wrapping, and control layout rather than concealing overflow. Retain usable star targets. |
| Mobile section clicks do not explicitly close the overlay when already on `/`. | Close on navigation, support Escape and focus restoration, and provide correct expanded/control semantics. |
| Fixed bottom CTA occupies scarce mobile space. | Remove the homepage’s floating CTA; keep the header and in-flow CTAs. No new sticky conversion bar. |
| “Google Verified,” a verification badge, hotel rating/review counts, and named testimonials are hard-coded without supporting proof. | Remove unsupported verification/results claims. Keep the hotel demo clearly illustrative and not an endorsement. Use honest, content-ready proof sections. |
| Pricing is currently a seven-day timeline, not a separate custom-quote section. | Reuse that timeline for the trial journey and add a concise quote-policy pricing section. |
| Current demo controls already call the real public AI service. | Preserve that component, request payload, generation behavior, languages, and customer control; improve presentation and feedback only. |
| Some old marketing mockups say “coming soon” for shipped features. | Use actual screens/services as evidence, not those mockups. |

The existing demo supports rating, highlights, optional detail/name/occasion, tone, language and RTL, generation, editing, regeneration, clipboard/Google handoff, sharing, contact saving, phone, directions, website, and social/location links. It has no Customer/Business switch today.

## 3. Verified capability map

Paths in this table are relative to `artifacts/` unless otherwise specified.

| Homepage module | Current product evidence | Safe claim and limits |
| --- | --- | --- |
| AI Review Assistant | `reviewmystore/src/pages/marketing/review-demo.tsx`; `api-server/src/routes/publicDemoReview.ts`; `api-server/src/services/publicReviewService.ts` | Help customers express their own experience in an editable draft. Never claim automatic review submission, guaranteed positive reviews, or ranking gains. |
| QR & Review Links | `reviewmystore/src/pages/Campaigns.tsx`, `QrCodes.tsx`; `api-server/src/routes/qr.ts`, `publicRedirect.ts` | Campaign QR codes, shareable short links, and downloadable QR assets. Browser-based customer flow; no app install. |
| Review Inbox | `reviewmystore/src/pages/Reviews.tsx`; `api-server/src/routes/reviewManagement.ts` | Import and manage connected Google reviews, subject to connection and usage limits. Do not promise every review destination or unlimited imports. |
| AI Reply Drafts | Reviews page; `reviewManagement.ts`; `api-server/src/services/aiService.ts` | Generate a suggested reply, review/edit it, and explicitly publish. No unattended AI replies or unsupported configurable brand-voice claims. |
| Business Analytics | `reviewmystore/src/pages/BusinessAnalytics.tsx`; `api-server/src/services/businessAnalyticsService.ts` | Inspect scans, generated drafts, Google redirects, imported reviews, replies, and supported reporting. A Google redirect is not a confirmed published review or proven conversion. |
| Agency/Multi-location Management | `reviewmystore/src/pages/Analytics.tsx`, business-selection UI; `api-server/src/services/dashboardService.ts`; `docs-site/docs/agencies.md` | Organize multiple businesses/locations and inspect supported agency/business reporting. Do not imply a new branch hierarchy, white-label settings, or universal teammate provisioning. |

Business branding settings were intentionally removed. Existing rollout notes also caution that teammate access depends on production schema readiness. Neither should become a new marketing promise.

No repository-supported, publication-approved customer testimonial evidence was found. Product documentation is evidence of functionality, not customer endorsement.

## 4. Exact page order and component reuse

Navigation: **Logo · Product · How It Works · For Agencies · Pricing · Resources · Start 7-Day Trial**

Product links to `#features`, How It Works to `#how-it-works`, For Agencies to `#agencies`, Pricing to `#pricing`, and Resources keeps `/resources`. Preserve the existing `#approach` deep link at the problem section and `#review-demo` at the live experience. About remains available in the footer. Cross-page anchors must return to `/` and reach the right section.

| Order | Section and proposed content | Reuse/change |
| --- | --- | --- |
| 1 | **Your reputation deserves a system.** Use the hero copy and reassurance group above. | Refine `HeroSection`; one H1 only. |
| 2 | **Your customer’s experience. Your team’s view.** Accessible Customer View / Business View controls above the functional demo. | Preserve `InteractiveReviewDemo`; add a presentation shell and isolated sample business preview. |
| 3 | **See the product. Keep the control.** Brief factual points: editable drafts, explicit Google handoff, guided setup. Link to the demo/docs, not fictional logos. | Rework `TrustedBySection`. Content slots can accept approved evidence later. |
| 4 | **Review requests are inconsistent.** One short explanation: requests rely on memory, customers start from a blank page, and teams need a repeatable way to manage feedback. | Condense `WhyBusinessesLoveUs`, retaining `#approach`. Avoid unsupported numerical claims. |
| 5 | **One reputation system.** Six cards using the exact module names in section 3, with one concrete sentence each. | Refine `FeaturesGrid`, add `#features`. |
| 6 | **How it works.** Customer: scan/open → share an experience → get a draft → edit → choose whether to continue to Google. Business: set up a business → create a campaign → share QR/link → inspect interactions → manage reviews and replies. | Replace the current three oversimplified steps with two concise journeys, not a gated wizard. |
| 7 | **Explore both sides of the experience.** Customer View / Business View walkthrough with selectable explanations and contextual “Continue in the live demo” entry points. | Add a small connected walkthrough; never mount a second live form or start generation here. See section 5. |
| 8 | **Without 5-Star.AI / With 5-Star.AI.** Ad-hoc asks, blank-page friction, scattered follow-up versus reusable QR/link, guided draft, customer control, and organized review management. | Compact comparison, not guaranteed outcomes or “no review” versus guaranteed review. |
| 9 | **A closer look at the tools.** Selectable AI, QR, Reviews, Replies, Analytics, Multi-location details. Each shows one supported action and its boundary, not another six long sales cards. | Small accessible detail component using the capability evidence above; no new chart library. |
| 10 | **For agencies managing more than one business.** Explain business switching, campaign organization, and available reporting. | Refine `DashboardShowcase`; clearly label any fixture visual “Sample data — not customer results.” Remove branding promises and growth deltas. |
| 11 | **Seven days to experience 5-Star.AI.** Day 1: business/setup. Day 3: QR/link or campaign rollout. Day 7: review activity and agree next steps. | Extract the existing timeline into `TrialJourney`; explain that this is guided, not automatically provisioned or a promise of review volume. |
| 12 | **Pricing shaped around your business.** Free trial, then a written custom quote covering businesses/locations, included usage, billing unit and frequency. | Separate `PricingSection`, add `#pricing`; link to `/terms` and the public usage guide. No public price tiers, discounts, private quotes, or payment capture. |
| 13 | **Customer stories, with permission.** “We only publish customer stories with permission. Until approved stories are available, explore the live demo and product guides to see how the workflow works.” | Preserve a compact content-ready testimonial structure, without names, avatars, star ratings, invented quotes, or “Verified” labels. |
| 14 | **Questions, answered plainly.** Use the FAQ coverage below. | Retain the accessible accordion in `FaqSection`. |
| 15 | **Start your 7-day free trial.** Main CTA: Start 7-Day Free Trial. Secondary: See How It Works. Repeat the reassurance group and guided-request qualifier. | Refine `CtaBand`. |

Keep the sections concise: short hero, compact trust strip, brief problem, one-sentence module cards, two journeys, compact comparison, and selectable deep-dive details. Do not repeat the entire six-module explanation in each section.

Footer routes remain valid: Resources, Blog, About, Docs, Privacy, Terms, and contact. Keep the existing public Docs destination. Confirm the usage-guide route against `docs-site/docs/.vitepress/config.*` and `docs-site/docs/usage-and-social.md` before linking.

## 5. One live demo, two connected entry points

### Recommended structure

- Keep **one mounted instance** of the current live customer component near the hero. Do not duplicate the form, request handler, or input IDs.
- Introduce only shared presentation state for Customer/Business mode and walkthrough selection. Leave the existing rating, highlights, tone, language, optional fields, draft, and generation state owned by the live component.
- Switching to Business View hides the customer panel without unmounting it. Inactive content must not remain keyboard-focusable or exposed as an active panel to assistive technology.
- Render one isolated business preview using explicitly labeled fixtures. It can demonstrate an inbox item, editable illustrative reply, activity labels, and business selection. It must never fetch private account data or actually publish replies.
- The later walkthrough is an interactive explanation of the same experience: its view controls share presentation state; its selectable steps explain the current customer/business action. “Continue my draft” or “Explore this business view” returns focus to the existing live panel. It is not a second embedded form.
- This retains inputs and edited drafts across view switches and in-page return trips. It does not introduce storage of personal input, promise persistence after refresh, or change the existing explicit regeneration/reset behavior.
- No request on view switching, scrolling, selecting explanatory steps, or initial render. Generate remains a deliberate button action; guard repeated clicks while pending.
- If generation completes while the customer panel is hidden, retain the result and announce status without scrolling to a hidden panel or stealing focus.

### Customer flow polish

Preserve the existing POST to `/api/v1/public/demo-review/generate`, including `sessionId`, rating, keywords, default tone, supported language, and nullable optional details. Preserve server limits and error semantics; do not rebuild backend behavior.

Improve visible labels for optional fields, selected highlights/tone, disabled-generation hints, and the transition from rating to context to editable draft. Progress is explanatory only; no new completion gates.

Use proper radio semantics and arrow-key behavior for rating; maintain useful touch targets and visible focus. Keep language selection and correct RTL direction/alignment. Marketing helper copy must not replace existing translated customer controls.

Show a meaningful pending state, an announced success state, and a recoverable error. Retain user inputs on failure. Offer a clear standalone copy action alongside the explicit copy/continue-to-Google handoff. Announce clipboard success; if copying fails, explain how to select/copy the draft rather than falsely claiming success.

Suggested handoff explanation:

> This draft is yours to edit or discard. Nothing is posted automatically. Google may ask you to sign in before you publish.

The existing hotel and external contact/share/location destinations stay intact. Remove unsupported “Verified” and numerical reputation claims. Add:

> Illustrative demo, not a customer endorsement. The Google button opens this business’s real review page. Only submit a review based on your genuine visit.

During verification, intercept this destination. Never post a review or activate telephone/contact side effects.

## 6. Trial, pricing, and proof

All primary hero/trial/pricing/final CTAs use **Start 7-Day Free Trial** and open the existing `BookDemoDialog`. The shorter header label remains **Start 7-Day Trial**, as requested.

Preserve the current required UI fields: name, agency/single-shop selection, business/shop name, and phone. Email is not currently collected; do not invent an email requirement. Preserve the hidden honeypot, generated mutation, submit mapping, pending state, validation, failure handling, success confirmation, and close/reset behavior.

Make the dialog title/action describe a **guided trial request**. Submission acknowledges a request; it must not show a newly created account, active dashboard, or automatically started trial. Do not promise delivery of an email or SMS that has not been verified.

Use these commercial statements consistently:

- The seven-day guided trial is free.
- No credit card or 5-Star.AI account creation is needed to request it; contact details are required.
- The trial does not automatically convert, renew, or charge.
- Paid service begins only after acceptance of a written custom quote.
- Included usage is governed by the quote and published application/provider limits.
- Stopping the trial and any paid cancellation terms follow the existing policy in Terms; do not invent “cancel anytime” paid-plan terms.

Do not use actual business records as public proof. Future customer logos, quotes, and results need a documented source and permission before publication. Sample business data must remain labeled even if the surrounding layout looks like a real dashboard.

## 7. Proposed FAQ coverage and answers

1. **What is 5-Star.AI?** A review and reputation workflow for local businesses, agencies, and multiple locations: QR/links, customer-assisted drafts, a review inbox, reply drafts, and reporting.
2. **How does the seven-day trial work?** Request a guided trial, then arrange business setup, a first QR/link or campaign, and a review of activity with the team. Request submission does not automatically provision access.
3. **Do I need a credit card or an account?** Neither is required to request the guided trial. The form collects contact details so the team can follow up. Google may separately require sign-in for publishing a customer review.
4. **Can customers edit or discard the AI draft?** Yes. The draft is a suggestion based on their experience; customers control the final words and whether to continue to Google. Nothing posts automatically.
5. **Do customers need an app? Can they use QR or a direct link?** QR codes and shareable links open in their normal browser. No app installation is required.
6. **Can agencies manage multiple businesses and locations?** Yes, through the existing business organization and reporting tools. Setup and included usage are agreed for the account.
7. **Will AI replies publish without approval?** No. The team reviews/edits the draft and deliberately publishes it through the supported connected review workflow.
8. **How much does it cost after the trial?** There is no fixed public price. A written quote defines price, billing unit/frequency, covered businesses and included usage before paid service starts. Link to Terms and the usage guide.
9. **How do I stop the trial? What happens on Day 7?** Review activity and decide whether to continue. There is no automatic paid conversion or charge. Use the existing contact route to stop; any paid-service notice or refund terms are in the accepted quote.

## 8. Responsive, accessibility, performance, and SEO plan

- Verify at 320, 375, 390, 430, 768, 1024, and 1440px, including selected-rating, generated-draft, business-preview, open-menu, and open-dialog states.
- At 320px, use less nested padding, `min-width: 0` where needed, wrapping headers, and stacked controls. Do not shrink the five rating controls below sensible touch targets or hide overflow as a substitute for fixing it.
- Keep mobile inputs legible (prefer 16px text), buttons large enough to use, and the dialog scrollable with the on-screen keyboard. No fixed CTA over the demo/dialog.
- Consolidate section scrolling, account for the fixed header, preserve hash/deep links and browser history, and respect reduced motion. Make mobile-menu closure and focus return deterministic.
- Use accessible view controls with clear selected state, keyboard navigation, named panels, and unique IDs for early/later controls. Do not focus hidden content.
- Preserve Radix dialog focus trapping and focus return. Improve lead-type selection keyboard semantics without changing its enum values.
- Scope dark styling to marketing, including portaled dialog/select surfaces. Keep authenticated styles, fonts, and theme settings unchanged.
- Use existing CSS/animation tools only. Prefer short opacity/color feedback; disable decorative movement and smooth scrolling for reduced motion. Do not autoplay product actions.
- Reuse the existing hotel image (about 175KB in the repository); reserve its dimensions and avoid new unoptimized visual assets. Ensure decorative elements do not affect layout or reading order.
- Use one H1, section H2s, logical H3s, meaningful image alt text, and no fake review/aggregate-rating structured data.
- Suggested title: **5-Star.AI — Google Review & Reputation Management**.
- Suggested description: **Help customers share genuine experiences with QR codes and AI-assisted drafts. Manage Google reviews, replies, and business activity. Request a guided 7-day free trial.**
- Update the existing route metadata/build-time pipeline as well as browser metadata. Preserve `marketing-prerender.tsx`, Vite route HTML emission, `hydrateRoot`, canonical configuration, and the non-marketing path guard.
- Confirm raw production HTML contains the hero, meaningful section copy, links, and exactly one H1 before hydration. Check all affected marketing routes because the layout is shared.

## 9. Implementation sequence after approval

1. Reconfirm the baseline and contract behavior; capture any intervening changes before editing.
2. Make incremental changes to `Marketing.tsx`, `marketing/layout.tsx`, `hero.tsx`, and `features.tsx` for navigation, hero, ordered sections, journeys, comparison, deep dive, and agency content.
3. Polish `review-demo.tsx` in place. Add small focused presentation/fixture components for the business view and connected walkthrough; do not replace the working generation flow.
4. Refine `pricing-faq.tsx`, split trial and pricing, remove unsupported proof, and update trial-dialog wording while preserving `components/book-demo-dialog.tsx` behavior.
5. Apply local responsive/reduced-motion styles and update the shared homepage metadata used by `vite.config.ts`. Do not rewrite global CSS or change auth/API contracts.
6. Add focused tests, run the completed-unit checks below, then report results and remaining blockers. No deployment is authorized.

Existing generated API code remains generated. The public demo and request endpoints, authorization boundaries, usage/billing policy, and Terms are constraints, not redesign targets.

## 10. Verification checklist for implementation

**Deterministic UI tests**

- Exact headline, navigation labels, section order and IDs; valid footer/docs/legal links; exactly one mounted live form.
- Mobile menu opens/closes via keyboard, Escape, same-page anchors and route changes; header-aware destination scrolling.
- Customer input and edited draft survive Customer → Business → Customer and later-walkthrough return. Switching during pending generation neither duplicates the request nor loses the eventual result.
- Rating, highlights, optional fields, all tone options, supported-language selection/RTL; successful generation, invalid/empty response, network error, 429, recovery, edit, copy success/failure and explicit regeneration.
- No generation on mount/view switch; no automatic Google navigation. Intercept external handoff and assert it occurs only after explicit action.
- Every conversion CTA opens the existing request flow; required fields, invalid input, pending state/double-submit protection, server error/retry, success and close/reset behavior.
- FAQ keyboard interaction and truthful answers; content-ready proof contains no unsupported endorsements or prices.

**Build and static output**

- Run relevant Vitest tests using `pnpm --filter @workspace/reviewmystore run test`.
- Run library/app typechecks as appropriate, then `pnpm --filter @workspace/reviewmystore run build`.
- Inspect emitted marketing HTML for body content, H1, metadata, canonical, internal links and the non-marketing path guard. A successful Vite bundle alone is not a typecheck or SEO verification.
- An existing proposed task covers the Reviews-page build/typecheck baseline. Report unrelated failures honestly; do not silently skip them or expand this landing work into an unrelated repair.

**One completed-journey browser pass**

- After the full implementation, check the altered demo and trial request flows plus navigation, FAQ, viewport matrix, focus, reduced motion, and RTL.
- Use network fixtures/interception for trial submissions so no real customer message or persisted production lead is created. Include slow, successful, and failed responses.
- Do not submit a Google review, publish a business reply, activate a phone call, or modify production data.
- Use fixture generation for reproducible state/error tests; any live development generation smoke check must be deliberate, limited, and must never proceed to publishing.
- Compare final screenshots with the baseline for brand continuity, not a wholesale redesign. Check actual overflow, not only cropped screenshots.

**Not executed in this planning turn:** code changes, new tests, typecheck/build, generation requests, trial submissions, mobile interaction tests, production checks, or publishing. Only repository inspection and the two read-only baseline screenshots were performed.

## Approval boundary

This document is the proposed implementation specification. Approval authorizes the incremental landing-page work above, not new account provisioning, authentication changes, payment collection, integrations, private data exposure, dashboard redesign, or deployment.