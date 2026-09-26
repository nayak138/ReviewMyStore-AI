import { type FC, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Link } from "wouter";
import { BrandIcon, BrandLogo } from "./brand";
import type { PolicyContent } from "./types";

export type { PolicyContent } from "./types";

const policyTitles: Record<Exclude<PolicyContent, null>, string> = {
  about: "About 5-Star.AI",
  resources: "Reputation Best Practices & Resources",
};

const policyContent: Record<Exclude<PolicyContent, null>, ReactNode> = {
  about: (
    <div className="space-y-4">
      <p>
        <strong>5-Star.AI</strong> was founded with a simple conviction:
        genuine customer satisfaction should not get lost in friction.
      </p>
      <p>
        We built 5-Star.AI to help customers express what they loved about a
        visit while keeping them in control of the final words they share.
      </p>
      <div className="p-4 rounded-xl bg-[#11182A] border border-[#1E293B] space-y-2">
        <h4 className="font-semibold text-white">Our core commitments</h4>
        {[
          "Never gate or manipulate authentic reviews.",
          "Customers authenticate and post directly to Google.",
          "Provide optional private channels for constructive feedback.",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {item}
          </div>
        ))}
      </div>
    </div>
  ),
  resources: (
    <div className="space-y-3">
      <p>
        Practical guides for local business owners and teams managing review
        operations:
      </p>
      {[
        "Google Review Policy & Anti-Incentive Rules",
        "The Natural Moment of Delight",
        "De-escalating Negative Feedback",
      ].map((item, index) => (
        <div
          key={item}
          className="p-4 rounded-xl bg-[#11182A] border border-[#1E293B]"
        >
          <h4 className="font-semibold text-white">
            {index + 1}. {item}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {index === 0
              ? "Invite feedback without offering incentives or manipulating customer choice."
              : index === 1
                ? "Where and when to position campaign links for a natural post-service moment."
                : "A practical framework for responding with poise, empathy, and constructive resolution."}
          </p>
        </div>
      ))}
    </div>
  ),
};

export const PolicyModal: FC<{
  type: PolicyContent;
  onClose: () => void;
}> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-policy-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0D1322] border border-[#263352] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#1E293B] bg-[#090E1B]">
          <div className="flex items-center gap-3">
            <BrandIcon size={28} />
            <h3 id="repo-policy-title" className="text-lg repo-serif font-bold text-white">
              {policyTitles[type]}
            </h3>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-policy"
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {policyContent[type]}
        </div>
        <div className="p-4 border-t border-[#1E293B] bg-[#090E1B] flex justify-end">
          <button
            onClick={onClose}
            data-testid="button-policy-done"
            className="px-4 py-2 bg-[#162035] hover:bg-[#1E293B] text-slate-200 text-xs font-semibold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const Footer: FC<{
  onOpenModal: (type: Exclude<PolicyContent, null>) => void;
  onRequestTrial: () => void;
}> = ({ onOpenModal, onRequestTrial }) => (
  <footer id="resources" className="bg-[#05070E] border-t border-[#162035] text-slate-400 py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#162035]">
        <div className="lg:col-span-2 space-y-4">
          <BrandLogo variant="light" size="sm" />
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
            5-Star.AI is the reputation-management system for local businesses
            and regional teams. Customers keep full control over every word,
            while teams get role-based access and aggregate business analytics.
          </p>
          <div className="pt-2 text-xs text-slate-400">
            Personalized setup · No credit card required
          </div>
        </div>
        <FooterLinks
          title="Product"
          links={[
            ["Customer Experience", "#product-preview"],
            ["AI Review Generator Demo", "#demo-generator"],
            ["How It Works", "#how-it-works"],
            ["Private Feedback System", "#features"],
          ]}
        />
        <FooterLinks
          title="Solutions"
          links={[
            ["For Teams & Agencies", "#for-agencies"],
            ["Pricing & Custom Quotes", "#pricing"],
            ["FAQ", "#faq"],
          ]}
          action={{
            label: "Request 7-Day Guided Trial",
            onClick: onRequestTrial,
          }}
        />
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Governance & Resources
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => onOpenModal("about")}
                data-testid="button-footer-about"
                className="hover:text-white text-left"
              >
                About 5-Star.AI
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenModal("resources")}
                data-testid="button-footer-resources"
                className="hover:text-white text-left"
              >
                Best Practices & Resources
              </button>
            </li>
            <li>
              <a
                href="https://docs.5-star.ai/"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-footer-public-docs"
                className="hover:text-white"
              >
                Help Center
              </a>
            </li>
            <li>
              <Link
                href="/privacy"
                data-testid="link-footer-privacy"
                className="hover:text-white"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                data-testid="link-footer-terms"
                className="hover:text-white"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
        <div>© {new Date().getFullYear()} 5-Star.AI. All rights reserved.</div>
        <div className="text-center sm:text-right max-w-xl leading-normal">
          Independent software tool. Google and Google Reviews are trademarks
          of Google LLC. Sample mockups and demo reviews are for demonstration
          purposes only.
        </div>
      </div>
    </div>
  </footer>
);

const FooterLinks: FC<{
  title: string;
  links: readonly (readonly [string, string])[];
  action?: { label: string; onClick: () => void };
}> = ({ title, links, action }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
      {title}
    </h4>
    <ul className="space-y-2 text-xs">
      {links.map(([label, href]) => (
        <li key={label}>
          <a
            href={href}
            data-testid={`link-footer-${label.toLowerCase().replaceAll(" ", "-")}`}
            className="hover:text-white"
          >
            {label}
          </a>
        </li>
      ))}
      {action && (
        <li>
          <button
            onClick={action.onClick}
            data-testid="button-footer-request-trial"
            className="text-[#1A73E8] hover:text-blue-300 font-medium text-left"
          >
            {action.label}
          </button>
        </li>
      )}
    </ul>
  </div>
);