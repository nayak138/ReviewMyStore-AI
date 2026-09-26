import "./_group.css";
import "./refresh.css";
import { MarketingLayout } from "./_shared/layout";
import { TrustedBySection } from "./_shared/hero";
import { FeaturesGrid, ComparisonSection, ToolDeepDive, DashboardShowcase, CtaBand } from "./_shared/features";
import { TrialJourney, PricingSection, FaqSection } from "./_shared/pricing-faq";
import { ExperienceProvider, HashNavigator, Walkthrough } from "./_shared/experience";
import { RefreshExperience } from "./_refresh/experience";
import { RefreshHero, RefreshApproach, RefreshHowItWorks, RefreshFeedback } from "./_refresh/sections";

export const SECTION_ORDER = [
  "top", "experience", "proof", "approach", "features", "how-it-works",
  "walkthrough", "comparison", "tools", "agencies", "trial", "pricing",
  "stories", "faq", "start",
] as const;

export function VisualRefresh() {
  return (
    <div className="visual-refresh" onClickCapture={(event) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (link && !link.getAttribute("href")?.startsWith("#") && !link.getAttribute("href")?.startsWith("/#")) event.preventDefault();
      if (link?.getAttribute("href") === "#") event.preventDefault();
    }}>
      <MarketingLayout dark>
        <ExperienceProvider>
          <HashNavigator />
          <RefreshHero />
          <RefreshExperience />
          <TrustedBySection />
          <RefreshApproach />
          <FeaturesGrid />
          <RefreshHowItWorks />
          <Walkthrough />
          <ComparisonSection />
          <ToolDeepDive />
          <DashboardShowcase />
          <TrialJourney />
          <PricingSection />
          <RefreshFeedback />
          <FaqSection />
          <CtaBand />
        </ExperienceProvider>
      </MarketingLayout>
    </div>
  );
}