import { MarketingLayout } from "./marketing/layout";
import { HeroSection, InteractiveSearchSection, TrustedBySection } from "./marketing/hero";
import { FeaturesGrid, ProductShowcase, AiWorkflow } from "./marketing/features";
import { ReviewInboxSection, AiReplyDemoSection, QrNfcSection, AnalyticsSection } from "./marketing/mockups";
import { PricingSection, TestimonialsSection, FaqSection, FinalCtaSection } from "./marketing/pricing-faq";

export default function Marketing() {
  return (
    <MarketingLayout>
      <HeroSection />
      <InteractiveSearchSection />
      <TrustedBySection />
      <FeaturesGrid />
      <ReviewInboxSection />
      <AiReplyDemoSection />
      <QrNfcSection />
      <AnalyticsSection />
      <ProductShowcase />
      <AiWorkflow />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaSection />
    </MarketingLayout>
  );
}
