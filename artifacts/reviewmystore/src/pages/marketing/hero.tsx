import { ArrowRight, BookOpen, Check, ClipboardEdit, PencilLine, Send, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrialDialogPlacement } from "@/components/book-demo-dialog";
import { scrollToSection } from "./scroll";
import { BookDemoDialog } from "@/components/book-demo-dialog-lazy";

export const REASSURANCE = ["7-Day Free Trial", "No Credit Card", "No Sign Up"] as const;
export const DOCS_URL = "https://docs.5-star.ai/";
export const USAGE_GUIDE_URL = "https://docs.5-star.ai/usage-and-social";

export function ReassuranceGroup({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-foreground/80 ${className}`} aria-label="Trial terms">
      {REASSURANCE.map((item) => (
        <li key={item} className="inline-flex items-center gap-1.5">
          <Check className="h-4 w-4 text-primary" aria-hidden /> {item}
        </li>
      ))}
    </ul>
  );
}

export function TrialCta({ testId, placement }: { testId: string; placement: TrialDialogPlacement }) {
  return (
    <BookDemoDialog marketingDark placement={placement}>
      <Button data-testid={testId} className="h-12 rounded-full bg-foreground px-6 text-[15px] font-semibold text-background shadow-[0_10px_30px_-14px_hsl(var(--primary)/0.9)] transition-[opacity,transform] hover:bg-foreground/90 active:scale-[0.98]">
        Start 7-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </BookDemoDialog>
  );
}

export function HowItWorksLink({ testId }: { testId: string }) {
  return (
    <a
      href="#review-demo"
      data-testid={testId}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection("review-demo");
      }}
      className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-secondary/60"
    >
      See How It Works
    </a>
  );
}

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="vr-hero" data-testid="section-hero">
      <div className="vr-hero-inner">
        <div className="vr-hero-copy">
          <p className="vr-overline">Genuine reviews, guided</p>
          <h1 id="hero-heading" className="font-display">Your reputation deserves a system.</h1>
          <p className="vr-hero-lede">
            5-Star.AI helps local businesses, agencies, and multi-location teams invite genuine Google reviews, manage feedback, and draft thoughtful replies. Customers keep control of their final words.
          </p>
          <div className="vr-hero-actions">
            <TrialCta testId="button-hero-trial" placement="hero" />
            <HowItWorksLink testId="link-hero-how-it-works" />
          </div>
          <div className="vr-terms">
            <strong>7-Day Free Trial · No Credit Card · No Sign Up</strong>
            Request a guided trial without creating a 5-Star.AI account. Share your contact details and our team will follow up to arrange setup.
          </div>
        </div>
        <div className="vr-hero-art" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}images/landing-graphics/reputation-sculpture.webp`}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <div className="vr-orbit-note vr-note-a"><Star />The moment they remember</div>
          <div className="vr-orbit-note vr-note-b"><ClipboardEdit />The words they choose</div>
        </div>
      </div>
    </section>
  );
}

/** Section 3 — factual product commitments, not customer endorsements. */
export function TrustedBySection() {
  return (
    <section id="proof" aria-label="Product commitments" className="vr-proof-strip" data-testid="section-proof">
      <div className="vr-proof-strip-inner">
        <span><PencilLine aria-hidden />Editable drafts, never scripted praise</span>
        <span><ShieldCheck aria-hidden />Nothing posts automatically</span>
        <span><Check aria-hidden />Guided setup with a real team</span>
      </div>
      <div className="vr-proof-links">
        <a href="#experience" onClick={(e) => { e.preventDefault(); scrollToSection("experience"); }} data-testid="link-proof-demo">
          Try the live demo <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" data-testid="link-proof-docs">
          <BookOpen className="h-4 w-4" aria-hidden /> Read the product guides
        </a>
      </div>
    </section>
  );
}
