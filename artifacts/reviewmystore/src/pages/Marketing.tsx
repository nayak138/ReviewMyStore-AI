import { MarketingLayout } from "./marketing/layout";
import { HeroSection, TrustedBySection } from "./marketing/hero";
import {
  WhyBusinessesLoveUs,
  FeaturesGrid,
  HowItWorks,
  ComparisonSection,
  ToolDeepDive,
  DashboardShowcase,
  CtaBand,
} from "./marketing/features";
import { TrialJourney, PricingSection, TestimonialsSection, FaqSection } from "./marketing/pricing-faq";
import { ExperienceProvider, ExperienceSection, HashNavigator, Walkthrough } from "./marketing/experience";

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

export default function Marketing() {
  return (
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
  );
}
