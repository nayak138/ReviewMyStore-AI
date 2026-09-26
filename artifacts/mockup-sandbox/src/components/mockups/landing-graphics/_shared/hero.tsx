import { ArrowRight, BookOpen, Check, PencilLine, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrialDialogPlacement } from "./trial-dialog";
import { scrollToSection } from "./scroll";
import { BookDemoDialog } from "./trial-dialog";

export const REASSURANCE = ["7-Day Free Trial", "No Credit Card", "No Sign Up"] as const;
export const DOCS_URL = "#";
export const USAGE_GUIDE_URL = "#";

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
      href="#how-it-works"
      data-testid={testId}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection("how-it-works");
      }}
      className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-secondary/60"
    >
      See How It Works
    </a>
  );
}

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative" data-testid="section-hero">
      <div className="mk-grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[80rem] px-5 pb-14 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-16 lg:pt-24">
        <p className="mk-eyebrow mk-fade-in inline-flex items-center gap-2">
          <span className="mk-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> Genuine reviews, guided
        </p>
        <h1 id="hero-heading" className="mk-fade-in mt-5 max-w-4xl font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.05em] text-balance sm:text-6xl lg:text-7xl">
          Your reputation deserves a system.
        </h1>
        <p className="mk-fade-in mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground [animation-delay:80ms]">
          5-Star.AI helps local businesses, agencies, and multi-location teams invite genuine Google reviews, manage feedback, and draft thoughtful replies. Customers keep control of their final words.
        </p>
        <div className="mk-fade-in mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:140ms]">
          <TrialCta testId="button-hero-trial" placement="hero" />
          <HowItWorksLink testId="link-hero-how-it-works" />
        </div>
        <div className="mt-8 max-w-2xl border-t border-border pt-5">
          <p className="text-sm font-semibold tracking-wide">7-Day Free Trial · No Credit Card · No Sign Up</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Request a guided trial without creating a 5-Star.AI account. Share your contact details and our team will follow up to arrange setup.
          </p>
        </div>
      </div>
    </section>
  );
}

const PROOF_POINTS = [
  { icon: PencilLine, title: "Editable drafts", body: "Customers rewrite, regenerate or discard every suggestion." },
  { icon: Send, title: "Explicit Google handoff", body: "Nothing posts automatically. Customers choose to continue." },
  { icon: ShieldCheck, title: "Guided setup", body: "Our team sets up your first business and campaign with you." },
];

/** Section 3 — factual product points; content slots for approved evidence later. */
export function TrustedBySection() {
  return (
    <section id="proof" aria-labelledby="proof-heading" className="py-16 sm:py-20" data-testid="section-proof">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <h2 id="proof-heading" className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">See the product. Keep the control.</h2>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
            <a href="#experience" onClick={(e) => { e.preventDefault(); scrollToSection("experience"); }} className="inline-flex items-center gap-1.5 text-primary hover:underline" data-testid="link-proof-demo">
              Try the live demo <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-foreground" data-testid="link-proof-docs">
              <BookOpen className="h-4 w-4" aria-hidden /> Read the product guides
            </a>
          </div>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {PROOF_POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-background p-5">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
