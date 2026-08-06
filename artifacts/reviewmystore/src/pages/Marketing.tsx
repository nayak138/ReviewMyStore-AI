import { useEffect } from "react";
import { MarketingLayout } from "./marketing/layout";
import { HeroSection, InteractiveSearchSection, TrustedBySection } from "./marketing/hero";
import { FeaturesGrid, ProductShowcase, AiWorkflow } from "./marketing/features";
import { ReviewInboxSection, AiReplyDemoSection, QrNfcSection, AnalyticsSection } from "./marketing/mockups";
import { PricingSection, TestimonialsSection, FaqSection, FinalCtaSection } from "./marketing/pricing-faq";

export default function Marketing() {
  // Support deep links like /#faq from other marketing pages.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

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
