# Landing-page polish — implementation and verification

The user approved `approval-plan.md` on 2026-09-25 before application edits began. These results belong to the implementation turn, not the original planning turn.

## Delivered

- All 15 approved sections, in order; the exact headline; one H1; the requested navigation and preserved deep links.
- One mounted live customer demo, connected Customer/Business controls and later walkthrough, retained inputs and edited drafts, and hidden-generation announcements without hidden-panel scrolling or focus theft.
- Isolated, labeled business fixtures with business/review selection, editable sample replies, and disabled publishing. No private-account queries.
- Guided-trial request wording, existing required fields and generated mutation mapping, duplicate-submit protection, retryable failures, truthful confirmation, and close/reset handling, including late responses after close.
- Custom-quote pricing, usage/Terms links, permission-only customer-story placeholder, and the nine approved FAQs. No invented endorsements, verification badges, results, public price tiers, or payments.
- Homepage-only dark styling, mobile menu keyboard/focus behavior, reduced-motion behavior, responsive controls, existing supported languages and RTL.
- Shared browser/build metadata, meaningful route bodies, hydration and fallback guard retained. Route metadata injection avoids duplicate canonicals; structured data does not misrepresent custom-quote service as a permanently free product.

The trial timeline is explanatory; the immediately following pricing section contains its trial-request CTA. Header, hero, pricing, final, footer/contact and mobile-menu request entries use the existing dialog.

## Deterministic and build checks

| Check | Result |
| --- | --- |
| `pnpm --filter @workspace/reviewmystore run test` | 21 files, 153 tests passed |
| `pnpm run typecheck:libs` | Passed |
| `pnpm --filter @workspace/reviewmystore run typecheck` | Passed after refreshing shared-library declarations |
| `pnpm --filter @workspace/reviewmystore run build` | Passed |
| `pnpm --filter @workspace/reviewmystore run verify:marketing` | All 9 emitted marketing routes passed |
| `git diff --check` | Passed |
| Frontend workflow restart and logs | Running cleanly |

The HTML verification command checks meaningful pre-hydration bodies, exactly one H1, unique titles, descriptions, one canonical and OG URL per route, correct canonical paths, legal/docs links, safe structured data, homepage section order, one demo, local dark scope, and fallback clearing for protected routes.

The build still reports non-blocking sourcemap warnings in existing shared UI components and a large initial JavaScript chunk (about 843 kB minified / 256 kB gzip). It succeeds; reducing initial download size is proposed separately.

## Completed visitor browser journey

One browser tester completed the visitor journey, using intercepted generation and lead responses and a safe fulfilled Google-handoff destination. The initial RTL instruction incorrectly named Arabic; it was corrected to the existing supported Urdu option without changing the language contract.

Verified:

- Rating keyboard controls, highlights, optional inputs, all four tone controls, supported Urdu selection and RTL.
- Slow generation, switching away while pending, one request, retained result/edit, business sample labeling, disabled publishing, and walkthrough return to the same live demo.
- Standalone copy success; clear manual-copy instructions on clipboard failure; explicit, single, same-tab Google handoff only after a deliberate click.
- Intercepted 429 generation failure, retained context and successful retry.
- Cross-page Resources → Product navigation, header-aware anchors, mobile menu focus loop/Escape/restoration, and dialog Escape without closing its containing menu.
- FAQ keyboard expansion.
- Desktop header, hero, pricing, final and mobile-menu trial entry points; required validation, keyboard lead-type choice, slow failed submission, retained details, successful retry, truthful request acknowledgment, and reset on reopening.
- Success-dialog focus returns to the opener after its exit transition. The earlier immediate focus observation was not a defect.
- Reduced motion and dark styling scoped to the homepage/dialog rather than the document theme.
- Actual page widths at 320, 375, 390, 430, 768, 1024 and 1440px: no horizontal document overflow. At 320px, customer controls, the business selector/reply preview and dialog internal content fit their containers. Decorative glow alone is clipped inside a noninteractive decorative wrapper.
- No unexpected application errors. Expected intercepted HTTP 429/500 failures and development/reduced-motion notices were observed.

The follow-up checked only two initially inconclusive behaviors (clipboard mock restoration before handoff and waiting for dialog exit before focus inspection), plus omitted CTA/320px checks; it was not a second full journey.

## Visual records and safety boundaries

- Original references: `baseline-desktop.jpg`, `baseline-mobile-320.jpg`.
- Final saved captures: `final-desktop.jpg`, `final-mobile-320.jpg`.
- Additional selected-rating, draft, Business View, menu, dialog, retry and confirmation screenshots are attached to the browser-test report.
- Brand continuity retained: existing logo, hotel image, Fraunces headings, DM Sans text and rounded bordered surfaces.

No deployment, authentication changes, payments, private-data access, real AI generation, persisted leads, customer messages, Google review posting, business reply publishing, phone call or contact-save action was performed. Live provider delivery and actual external publishing were intentionally not tested.