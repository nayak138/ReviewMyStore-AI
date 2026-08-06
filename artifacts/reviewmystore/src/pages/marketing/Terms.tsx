import { LegalPage } from "./LegalPage";

const sections = [
  {
    title: "Agreement to these terms",
    body: (
      <p>
        These Terms of Service ("Terms") govern your access to and use of the ReviewMyStore.AI
        platform, website, and related services (the "Service") provided by ReviewMyStore.AI
        ("ReviewMyStore", "we", "us"). By creating an account or using the Service, you agree to be
        bound by these Terms. If you are using the Service on behalf of a business, you represent
        that you have authority to bind that business.
      </p>
    ),
  },
  {
    title: "The service",
    body: (
      <p>
        ReviewMyStore helps businesses invite their customers to leave Google reviews using QR
        codes, NFC tags, and AI-assisted review drafting. AI-generated drafts are suggestions that
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
        Some parts of the Service may be offered for a fee. Pricing and billing terms are presented
        at the time of purchase. Unless stated otherwise, fees are non-refundable to the extent
        permitted by law, and we may change pricing with reasonable advance notice.
      </p>
    ),
  },
  {
    title: "Intellectual property",
    body: (
      <>
        <p>
          The Service, including its software, design, and branding, is owned by ReviewMyStore and
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
        To the maximum extent permitted by law, ReviewMyStore will not be liable for any indirect,
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
        <a href="mailto:contact@reviewmystore.ai" className="text-primary hover:underline">
          contact@reviewmystore.ai
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
      intro="The rules for using ReviewMyStore.AI — plainly stated."
      lastUpdated="August 6, 2026"
      sections={sections}
      metaTitle="Terms of Service — ReviewMyStore.AI"
      metaDescription="Read the Terms of Service for ReviewMyStore.AI, the AI-powered Google review platform for local businesses."
    />
  );
}
