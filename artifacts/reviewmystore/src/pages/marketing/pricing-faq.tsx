import { ArrowUpRight, FileText, Quote } from "lucide-react";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrialCta, USAGE_GUIDE_URL } from "./hero";

const TRIAL_DAYS = [
  { day: "Day 1", title: "Business setup", body: "We set up your business and its Google review destination together." },
  { day: "Day 3", title: "QR, link or campaign rollout", body: "Your first campaign goes live at the counter, on invoices or by message." },
  { day: "Day 7", title: "Review activity, agree next steps", body: "We look at what happened and decide together whether to continue." },
];

/** Section 11. */
export function TrialJourney() {
  return (
    <section id="trial" aria-labelledby="trial-heading" className="py-20 sm:py-24" data-testid="section-trial">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <p className="mk-eyebrow">Guided trial</p>
        <h2 id="trial-heading" className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">Seven days to experience 5-Star.AI.</h2>
        <ol className="relative mt-12 grid gap-4 md:grid-cols-3">
          <span className="mk-hairline absolute left-0 right-0 top-[1.1rem] hidden md:block" aria-hidden />
          {TRIAL_DAYS.map((d) => (
            <li key={d.day} className="relative">
              <span className="relative inline-flex h-9 items-center rounded-full border border-primary/40 bg-background px-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">{d.day}</span>
              <h3 className="mt-5 text-lg font-semibold">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-2xl text-sm text-muted-foreground">The trial is guided by our team, not automatically provisioned, and it is not a promise of review volume.</p>
      </div>
    </section>
  );
}

/** Section 12. */
export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-border/70 bg-secondary/25 py-20 sm:py-24" data-testid="section-pricing">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10">
        <div>
          <p className="mk-eyebrow">Pricing</p>
          <h2 id="pricing-heading" className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">Pricing shaped around your business.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">Start with a free guided trial. If you continue, you receive a written custom quote before any paid service begins.</p>
          <div className="mt-8"><TrialCta testId="button-pricing-trial" /></div>
        </div>
        <div className="mk-card p-6 sm:p-8">
          <h3 className="flex items-center gap-2 text-base font-semibold"><FileText className="h-4 w-4 text-primary" aria-hidden /> Your written quote covers</h3>
          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {["Businesses and locations", "Included usage", "Billing unit", "Billing frequency"].map((x) => (
              <li key={x} className="rounded-xl border border-border bg-background/50 px-4 py-3">{x}</li>
            ))}
          </ul>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>The seven-day guided trial is free and never converts, renews or charges automatically.</li>
            <li>Paid service begins only after you accept a written quote.</li>
            <li>Included usage follows the quote and published application/provider limits.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/terms" className="text-primary hover:underline" data-testid="link-pricing-terms">Terms</Link>
            <a href={USAGE_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" data-testid="link-pricing-usage">Usage guide <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 13 — content-ready, no invented quotes, names or ratings. */
export function TestimonialsSection() {
  return (
    <section id="stories" aria-labelledby="stories-heading" className="py-20 sm:py-24" data-testid="section-stories">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <div className="mk-card grid gap-6 p-6 sm:p-10 md:grid-cols-[auto_1fr]">
          <Quote className="h-8 w-8 text-primary/70" aria-hidden />
          <div>
            <h2 id="stories-heading" className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Customer stories, with permission.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              We only publish customer stories with permission. Until approved stories are available, explore the live demo and product guides to see how the workflow works.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export const FAQS = [
  { q: "What is 5-Star.AI?", a: "A review and reputation workflow for local businesses, agencies, and multiple locations: QR codes and links, customer-assisted drafts, a review inbox, reply drafts, and reporting." },
  { q: "How does the seven-day trial work?", a: "Request a guided trial, then arrange business setup, a first QR code, link or campaign, and a review of activity with the team. Submitting a request does not automatically provision access." },
  { q: "Do I need a credit card or an account?", a: "Neither is required to request the guided trial. The form collects contact details so the team can follow up. Google may separately require sign-in when a customer publishes a review." },
  { q: "Can customers edit or discard the AI draft?", a: "Yes. The draft is a suggestion based on their experience; customers control the final words and whether to continue to Google. Nothing posts automatically." },
  { q: "Do customers need an app? Can they use QR or a direct link?", a: "QR codes and shareable links open in their normal browser. No app installation is required." },
  { q: "Can agencies manage multiple businesses and locations?", a: "Yes, through the existing business organisation and reporting tools. Setup and included usage are agreed for the account." },
  { q: "Will AI replies publish without approval?", a: "No. Your team reviews and edits the draft, then deliberately publishes it through the supported connected review workflow." },
  { q: "How much does it cost after the trial?", a: "There is no fixed public price. A written quote defines price, billing unit and frequency, covered businesses and included usage before paid service starts. See the Terms and the usage guide." },
  { q: "How do I stop the trial? What happens on Day 7?", a: "Review activity and decide whether to continue. There is no automatic paid conversion or charge. Use the contact route to stop; any paid-service notice or refund terms are in the accepted quote." },
];

/** Section 14. */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-20 sm:py-24" data-testid="section-faq">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <h2 id="faq-heading" className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Questions, answered plainly.</h2>
        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQS.map((faq, i) => (
            <AccordionItem key={faq.q} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="min-h-[44px] py-5 text-left text-base font-semibold hover:text-primary hover:no-underline" data-testid={`faq-trigger-${i}`}>{faq.q}</AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-8 text-sm text-muted-foreground">
          More detail: <Link href="/terms" className="font-semibold text-primary hover:underline">Terms</Link> ·{" "}
          <a href={USAGE_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Usage guide</a> ·{" "}
          <a href="mailto:hello@5-star.ai" className="font-semibold text-primary hover:underline">Contact</a>
        </p>
      </div>
    </section>
  );
}
