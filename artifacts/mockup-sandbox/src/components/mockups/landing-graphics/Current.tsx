import "./_group.css";
import { MarketingLayout } from "./_shared/layout";
import { HeroSection, TrustedBySection } from "./_shared/hero";
import {
  WhyBusinessesLoveUs,
  FeaturesGrid,
  HowItWorks,
  ComparisonSection,
  ToolDeepDive,
  DashboardShowcase,
  CtaBand,
} from "./_shared/features";
import { TrialJourney, PricingSection, TestimonialsSection, FaqSection } from "./_shared/pricing-faq";
import { ExperienceProvider, ExperienceSection, HashNavigator, Walkthrough } from "./_shared/experience";

/** The approved 15-section order. Tests assert against this list. */
export const SECTION_ORDER = [
  "top",
  "experience",
  "proof",
  "approach",
  "features",
  "how-it-works",
  "walkthrough",
  "comparison",
  "tools",
  "agencies",
  "trial",
  "pricing",
  "stories",
  "faq",
  "start",
] as const;

export function Current() {
  return (
    <div onClickCapture={(event) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (link && !link.getAttribute("href")?.startsWith("#") && !link.getAttribute("href")?.startsWith("/#")) event.preventDefault();
      if (link?.getAttribute("href") === "#") event.preventDefault();
    }}>
      <MarketingLayout dark>
        <ExperienceProvider>
          <HashNavigator />
          <HeroSection />
          <ExperienceSection />
          <TrustedBySection />
          <WhyBusinessesLoveUs />
          <FeaturesGrid />
          <HowItWorks />
          <Walkthrough />
          <ComparisonSection />
          <ToolDeepDive />
          <DashboardShowcase />
          <TrialJourney />
          <PricingSection />
          <TestimonialsSection />
          <FaqSection />
          <CtaBand />
        </ExperienceProvider>
      </MarketingLayout>
    </div>
  );
}
