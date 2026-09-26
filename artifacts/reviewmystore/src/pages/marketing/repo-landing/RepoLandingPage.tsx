import { useState, type FC } from "react";
import type { TrialDialogPlacement } from "@/components/book-demo-dialog";
import { DEFAULT_META } from "../route-meta";
import { usePageMeta } from "../use-page-meta";
import "./repo-landing.css";
import {
  FAQSection,
  Features,
  Footer,
  Header,
  Hero,
  HowItWorks,
  PolicyModal,
  PricingSection,
  ProductPreview,
  ReviewGeneratorDemo,
  TrialRequestSection,
} from "./index";
import type { PolicyContent } from "./index";

export interface RepoLandingPageProps {
  onRequestTrial: (placement: TrialDialogPlacement) => void;
}

export const RepoLandingPage: FC<RepoLandingPageProps> = ({ onRequestTrial }) => {
  const [policy, setPolicy] = useState<PolicyContent>(null);
  usePageMeta(DEFAULT_META.title, DEFAULT_META.description, "/");
  const scrollToDemo = () => document.getElementById("demo-generator")?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="repo-landing repo-scrollbar selection:bg-[#1A73E8]/30 selection:text-white">
      <Header onRequestTrial={(placement) => onRequestTrial(placement)} onOpenResources={() => setPolicy("resources")} />
      <main>
        <Hero onRequestTrial={() => onRequestTrial("hero")} onScrollToDemo={scrollToDemo} />
        <ProductPreview />
        <ReviewGeneratorDemo />
        <HowItWorks onRequestTrial={() => onRequestTrial("final_cta")} />
        <Features />
        <PricingSection onRequestTrial={() => onRequestTrial("pricing")} />
        <TrialRequestSection onRequestTrial={() => onRequestTrial("final_cta")} />
        <FAQSection onRequestTrial={() => onRequestTrial("final_cta")} />
      </main>
      <Footer onOpenModal={setPolicy} onRequestTrial={() => onRequestTrial("footer_team")} />
      <PolicyModal type={policy} onClose={() => setPolicy(null)} />
    </div>
  );
};

export default RepoLandingPage;