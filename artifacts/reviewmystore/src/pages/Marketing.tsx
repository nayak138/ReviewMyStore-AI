import { useEffect } from "react";
import { MarketingLayout } from "./marketing/layout";
import { HeroSection, TrustedBySection } from "./marketing/hero";
import { 
  WhyBusinessesLoveUs, 
  FeaturesGrid, 
  HowItWorks, 
  DashboardShowcase, 
  CtaBand 
} from "./marketing/features";
import { PricingSection, FaqSection } from "./marketing/pricing-faq";

export default function Marketing() {
  // Support deep links like /#features from other pages.
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
      <TrustedBySection />
      <WhyBusinessesLoveUs />
      <FeaturesGrid />
      <HowItWorks />
      <DashboardShowcase />
      <PricingSection />
      <FaqSection />
      <CtaBand />
    </MarketingLayout>
  );
}