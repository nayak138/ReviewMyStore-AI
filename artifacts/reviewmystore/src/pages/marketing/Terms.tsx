import { LegalPage } from "./LegalPage";
import { TERMS_META } from "./route-meta";

const sections = [
  {
    title: "Agreement to these terms",
    body: (
      <p>
        These Terms of Service ("Terms") govern your access to and use of the 5-Star.AI
        platform, website, and related services (the "Service") provided by 5-Star.AI
        ("5-Star.AI", "we", "us"). By creating an account or using the Service, you agree to be
        bound by these Terms. If you are using the Service on behalf of a business, you represent
        that you have authority to bind that business.
      </p>
    ),
  },
  {
    title: "The service",
    body: (
      <p>
        5-Star.AI helps businesses invite their customers to leave Google reviews using QR
        codes, shareable links, and AI-assisted review drafting. AI-generated drafts are suggestions that
        customers can edit or discard; posting is always the customer's decision. We do not
        guarantee any particular number of reviews, star rating, or search-ranking outcome.
      </p>
    ),
  },
  {
    title: "Accounts and eligibility",
    body: (
      <>
        <p>
          You must be at least 18 years old and capable of forming a binding contract to create an
          account. You are responsible for maintaining the confidentiality of your account
          credentials and for all activity that occurs under your account.
        </p>
        <p>
          You agree to provide accurate information about yourself and your business and to keep it
          up to date.
        </p>
      </>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Solicit, generate, or post fake, misleading, or incentivized reviews, or reviews from
            people who are not genuine customers;
          </li>
          <li>
            Violate Google's review policies or the terms of any third-party platform where reviews
            are posted;
          </li>
          <li>Harass, deceive, or discriminate against customers based on expected review sentiment;</li>
          <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service;</li>
          <li>Violate any applicable law or regulation, including consumer-protection laws.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules. You are solely responsible
          for how you use review content collected through the Service.
        </p>
      </>
    ),
  },
  {
    title: "Third-party platforms",
    body: (
      <p>
        The Service interacts with third-party platforms such as Google. Those platforms have their
        own terms and policies, and your use of them is governed by those terms. We are not
        responsible for the actions of third-party platforms, including the removal or moderation of
        reviews.
      </p>
    ),
  },
  {
    title: "AI-generated content",
    body: (
      <p>
        Review drafts are produced by AI models and may contain inaccuracies. Drafts are provided
        as-is for the customer to review and edit. The person posting a review is responsible for
        its final content, and businesses are responsible for ensuring their use of AI-assisted
        drafting complies with applicable law and platform policies.
      </p>
    ),
  },
  {
    title: "Fees and billing",
    body: (
      <p>
        5-Star.AI is an agency-led service with custom pricing and no fixed public plan price. Before
        paid service begins, we will provide a written quote that states whether fees are per agency
        account or per business or location, which businesses or locations are covered, included
        usage, billing frequency, and applicable taxes. The 7-day trial is free, does not
        automatically convert to a paid plan, and does not trigger a charge. Paid service begins
        only after you accept the quote. You may cancel by emailing{" "}
        <a href="mailto:hello@5-star.ai" className="text-primary hover:underline">
          hello@5-star.ai
        </a>
        ; any notice period, effective date, or refund terms will be stated in your accepted quote.
        We may change pricing with reasonable advance notice.
      </p>
    ),
  },
  {
    title: "Business usage limits",
    body: (
      <>
        <p>
          Usage allowances are tracked separately for each business in your
          account and are not reset when you reconnect or replace a Google
          Business location, Facebook Page, Instagram account, or other social
          channel. Reconnecting keeps the business, billing history, audit
          records, and usage ledger intact. Provider-linked reviews and
          channel data may be removed after a replacement is successfully
          confirmed.
        </p>
        <p>
          Included usage is custom and will be stated in your written quote.
          Application usage allowances are technical limits, not a promise that
          the same volume is available across an agency account. Failed provider
          requests release their reserved allowance; accepted scheduled or
          published actions count, and deleting a scheduled action does not
          refund its allowance.
        </p>
        <p>
          Provider capacity is separate from our application allowances and is
          shared across businesses connected through our bundle.social account.
          The 5-Star.AI business allowance is 200 Google review imports per
          business per UTC calendar month; the separate
          bundle.social provider cap is shared across all connected businesses
          and is not an additional per-business entitlement. Use by other
          connected businesses can reduce remaining shared capacity. Included
          quantities in a written quote are subject to the lower of our
          application allowances and available provider capacity. Provider
          limits and throttles apply, may change under bundle.social's terms,
          and can constrain usage below application allowances.
        </p>
        <p>
          Meta usage is aggregated across all connected Facebook and Instagram
          platforms. Monthly base limits are 50 posts, 25 imported comments,
          and 500 completed media uploads. Hard daily limits are 10 posts, 5
          comment units, and 100 completed media uploads. Cross-posting consumes
          one post unit per selected destination. Each newly imported comment
          uses one daily comment unit; its single allowed reply shares that unit
          if sent on the same UTC day, while a later-day reply uses one unit on
          that day. No imported comment may receive more than one reply.
          Warnings appear at 80% of the applicable limit. Daily hard stops block
          additional activity after the daily limit is reached.
        </p>
        <p>
          Monthly overages are tiered by category block: posts, imported
          comments, and completed media uploads. The highest category multiplier
          reached applies once to the quoted base amount; category multipliers
          are not stacked or applied once per destination. Usage within a
          category's monthly base limit is 1×; the first additional block equal
          to that category's base limit is 2×, and the second additional block
          is 3×. Owners and admins can view a manual invoice estimate for
          monthly overages. The estimate is not an automatic charge, and
          5-Star.AI does not automatically collect payment.
        </p>
      </>
    ),
  },
  {
    title: "Intellectual property",
    body: (
      <>
        <p>
          The Service, including its software, design, and branding, is owned by 5-Star.AI and
          protected by intellectual-property laws. We grant you a limited, non-exclusive,
          non-transferable license to use the Service for your business purposes.
        </p>
        <p>
          You retain ownership of the content you submit to the Service. You grant us a license to
          use that content solely to operate and improve the Service.
        </p>
      </>
    ),
  },
  {
    title: "Termination",
    body: (
      <p>
        You may stop using the Service and close your account at any time. We may suspend or
        terminate your access if you violate these Terms, create risk or legal exposure for us, or
        if we discontinue the Service. Upon termination, your right to use the Service ends, but
        sections that by their nature should survive (such as intellectual property, disclaimers,
        and limitations of liability) will survive.
      </p>
    ),
  },
  {
    title: "Disclaimers",
    body: (
      <p>
        The Service is provided "as is" and "as available" without warranties of any kind, whether
        express or implied, including warranties of merchantability, fitness for a particular
        purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
        error-free, or that reviews collected through the Service will remain published on any
        third-party platform.
      </p>
    ),
  },
  {
    title: "Limitation of liability",
    body: (
      <p>
          To the maximum extent permitted by law, 5-Star.AI will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, revenue,
        data, or goodwill, arising out of or related to your use of the Service. Our total liability
        for any claim will not exceed the amount you paid us in the twelve months preceding the
        claim, or one hundred US dollars if you have paid us nothing.
      </p>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>
        We may update these Terms from time to time. When we do, we will revise the "Last updated"
        date above and, for material changes, provide notice by email or through the Service. Your
        continued use of the Service after changes take effect constitutes acceptance of the revised
        Terms.
      </p>
    ),
  },
  {
    title: "Contact us",
    body: (
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:hello@5-star.ai" className="text-primary hover:underline">
          hello@5-star.ai
        </a>
        .
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      badge="Legal"
      title="Terms of Service"
      intro="The rules for using 5-Star.AI — plainly stated."
      lastUpdated="September 25, 2026"
      sections={sections}
      metaTitle={TERMS_META.title}
      metaDescription={TERMS_META.description}
      path="/terms"
    />
  );
}
