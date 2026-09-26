import { useEffect, useRef, useState } from "react";
import { BusinessPreview, useExperience, ViewSwitch } from "../_shared/experience";
import { scrollToSection } from "../_shared/scroll";
import { InteractiveReviewDemo } from "./review-demo";

export function RefreshExperience() {
  const { view, focusRequest } = useExperience();
  const customerRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef(0);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (lastFocus.current === focusRequest) return;
    lastFocus.current = focusRequest;
    scrollToSection("experience", { onDone: () => (view === "customer" ? customerRef : businessRef).current?.focus({ preventScroll: true }) });
  }, [focusRequest, view]);
  return (
    <section id="experience" aria-labelledby="experience-heading" className="border-y border-border/70 py-16 sm:py-24" data-testid="section-experience">
      <div className="mx-auto max-w-[80rem] px-4 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl"><p className="mk-eyebrow">The product, in practice</p><h2 id="experience-heading" className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">Your customer’s experience. Your team’s view.</h2><p className="mt-4 leading-relaxed text-muted-foreground">Try the customer flow, then switch sides to see how a team follows up. Your inputs stay put while you switch.</p></div>
          <ViewSwitch idPrefix="experience" label="Choose a view of the demo" />
        </div>
        <p role="status" aria-live="polite" className="sr-only">{view === "business" ? status : ""}</p>
        <div className="mt-10">
          <div ref={customerRef} id="experience-panel-customer" role="tabpanel" aria-labelledby="experience-tab-customer" tabIndex={-1} hidden={view !== "customer"} data-testid="panel-customer"><InteractiveReviewDemo active={view === "customer"} onStatusChange={setStatus} /></div>
          <div ref={businessRef} id="experience-panel-business" role="tabpanel" aria-labelledby="experience-tab-business" tabIndex={-1} hidden={view !== "business"} data-testid="panel-business"><BusinessPreview /></div>
        </div>
      </div>
    </section>
  );
}