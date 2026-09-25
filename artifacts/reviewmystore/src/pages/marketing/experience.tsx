import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowRight, Lock, MessageSquareText, QrCode, ScanLine, Star } from "lucide-react";
import { InteractiveReviewDemo } from "./review-demo";
import { SAMPLE_BUSINESSES, SAMPLE_DATA_LABEL } from "./business-fixtures";
import { focusSection, scrollToSection } from "./scroll";
import { trackEvent } from "@/lib/analytics";

export type ExperienceView = "customer" | "business";

export const EXPERIENCE_SECTION_ID = "experience";
export const PANEL_IDS: Record<ExperienceView, string> = {
  customer: "experience-panel-customer",
  business: "experience-panel-business",
};

interface ExperienceState {
  view: ExperienceView;
  setView: (view: ExperienceView) => void;
  /** Switch view, scroll to the live panel and move focus there. */
  returnToLive: (view: ExperienceView) => void;
  focusRequest: number;
}

const ExperienceContext = createContext<ExperienceState | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ExperienceView>("customer");
  const [focusRequest, setFocusRequest] = useState(0);
  const returnToLive = useCallback((next: ExperienceView) => {
    setView(next);
    setFocusRequest((n) => n + 1);
  }, []);
  const value = useMemo(() => ({ view, setView, returnToLive, focusRequest }), [view, returnToLive, focusRequest]);
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceState {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used inside ExperienceProvider");
  return ctx;
}

const VIEWS: { id: ExperienceView; label: string }[] = [
  { id: "customer", label: "Customer View" },
  { id: "business", label: "Business View" },
];

/** Accessible two-tab switch. `idPrefix` keeps early/later instances unique. */
export function ViewSwitch({ idPrefix, label }: { idPrefix: string; label: string }) {
  const { view, setView } = useExperience();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectView = (nextView: ExperienceView) => {
    if (nextView !== view) {
      trackEvent("landing_view_switched", {
        placement: idPrefix,
        from_view: view,
        to_view: nextView,
      });
    }
    setView(nextView);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % VIEWS.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + VIEWS.length) % VIEWS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = VIEWS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectView(VIEWS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="mk-switch" data-view={view}>
      {VIEWS.map((v, i) => (
        <button
          key={v.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${v.id}`}
          aria-selected={view === v.id}
          aria-controls={PANEL_IDS[v.id]}
          tabIndex={view === v.id ? 0 : -1}
          data-testid={`${idPrefix}-tab-${v.id}`}
          onClick={() => selectView(v.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

/** Section 2: the single mounted live demo plus the isolated business preview. */
export function ExperienceSection() {
  const { view, focusRequest } = useExperience();
  const panelRefs = useRef<Record<ExperienceView, HTMLDivElement | null>>({ customer: null, business: null });
  const lastFocus = useRef(0);
  const [demoStatus, setDemoStatus] = useState("");

  useEffect(() => {
    if (focusRequest === lastFocus.current) return;
    lastFocus.current = focusRequest;
    scrollToSection(EXPERIENCE_SECTION_ID, {
      onDone: () => panelRefs.current[view]?.focus({ preventScroll: true }),
    });
  }, [focusRequest, view]);

  return (
    <section id={EXPERIENCE_SECTION_ID} aria-labelledby="experience-heading" className="relative border-y border-border/70 bg-background/40 py-16 sm:py-20" data-testid="section-experience">
      <div className="mx-auto max-w-[80rem] px-4 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0 max-w-2xl">
            <p className="mk-eyebrow">Live product preview</p>
            <h2 id="experience-heading" className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              Your customer’s experience. Your team’s view.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Try the real customer flow, then switch sides to see how a team follows up. Your inputs stay put while you switch.
            </p>
          </div>
          <ViewSwitch idPrefix="experience" label="Choose a view of the demo" />
        </div>

        {/* Announces live-demo progress while the customer panel is hidden. */}
        <p role="status" aria-live="polite" className="sr-only" data-testid="status-experience-demo">
          {view === "business" ? demoStatus : ""}
        </p>
        {view === "business" && demoStatus && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-sm text-foreground" aria-hidden data-testid="text-experience-demo-status">
            <span className="mk-pulse-dot h-1.5 w-1.5 rounded-full bg-primary" /> Customer demo: {demoStatus}
          </p>
        )}
        <div className="mt-10">
          <div
            id={PANEL_IDS.customer}
            role="tabpanel"
            aria-labelledby="experience-tab-customer"
            tabIndex={-1}
            hidden={view !== "customer"}
            ref={(el) => {
              panelRefs.current.customer = el;
            }}
            className="rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="panel-customer"
          >
            <InteractiveReviewDemo active={view === "customer"} onStatusChange={setDemoStatus} />
          </div>
          <div
            id={PANEL_IDS.business}
            role="tabpanel"
            aria-labelledby="experience-tab-business"
            tabIndex={-1}
            hidden={view !== "business"}
            ref={(el) => {
              panelRefs.current.business = el;
            }}
            className="rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="panel-business"
          >
            <BusinessPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Isolated fixture-driven business preview. Never fetches or publishes. */
export function BusinessPreview() {
  const [businessId, setBusinessId] = useState(SAMPLE_BUSINESSES[0].id);
  const [reviewIndex, setReviewIndex] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const business = SAMPLE_BUSINESSES.find((b) => b.id === businessId) ?? SAMPLE_BUSINESSES[0];
  const review = business.reviews[reviewIndex[business.id] ?? 0] ?? business.reviews[0];
  const draft = drafts[review.id] ?? review.suggestedReply;

  return (
    <div className="mk-card min-w-0" data-testid="business-preview">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--mk-violet)/0.4)] bg-[hsl(var(--mk-violet)/0.1)] px-3 py-1 text-xs font-semibold text-[hsl(var(--mk-violet))]" data-testid="label-sample-data">
          {SAMPLE_DATA_LABEL}
        </span>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <span className="text-muted-foreground">Business</span>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            className="h-11 min-w-0 max-w-full rounded-xl border border-input bg-secondary px-3 text-base text-foreground sm:text-sm"
            data-testid="select-sample-business"
          >
            {SAMPLE_BUSINESSES.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 border-b border-border p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{business.kind}</p>
          <p className="mt-2 flex items-center gap-2 text-sm"><QrCode className="h-4 w-4 text-primary" aria-hidden /> {business.campaign}</p>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {business.activity.map((a) => (
              <div key={a.label} className="min-w-0 rounded-xl border border-border bg-secondary/50 p-3">
                <dt className="truncate text-[11px] text-muted-foreground" title={a.label}>{a.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{a.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">A Google redirect means someone chose to continue — not a confirmed published review.</p>

          <h3 className="mt-7 text-sm font-semibold">Review inbox</h3>
          <ul className="mt-3 space-y-2">
            {business.reviews.map((r, i) => {
              const selected = r.id === review.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setReviewIndex((s) => ({ ...s, [business.id]: i }))}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/35"}`}
                    data-testid={`button-sample-review-${r.id}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{r.author}</span><span>{r.age}</span>
                    </span>
                    <span className="mt-1 flex gap-0.5" aria-label={`${r.rating} of 5 stars`}>
                      {Array.from({ length: 5 }, (_, s) => (
                        <Star key={s} aria-hidden className={`h-3.5 w-3.5 ${s < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                      ))}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm">{r.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-primary" aria-hidden /> Suggested reply draft</h3>
          <blockquote className="mt-3 rounded-xl border-l-2 border-primary/60 bg-secondary/40 p-3 text-sm text-muted-foreground">“{review.text}”</blockquote>
          <label htmlFor="sample-reply" className="mt-4 block text-xs font-medium text-muted-foreground">Edit before publishing (illustrative)</label>
          <textarea
            id="sample-reply"
            value={draft}
            onChange={(e) => setDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
            rows={5}
            className="mt-2 w-full resize-y rounded-xl border border-input bg-background/60 p-3 text-base leading-relaxed text-foreground sm:text-sm"
            data-testid="textarea-sample-reply"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled aria-describedby="sample-publish-note" className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground" data-testid="button-sample-publish">
              <Lock className="h-4 w-4" aria-hidden /> Publish reply
            </button>
            <button type="button" onClick={() => setDrafts((d) => { const n = { ...d }; delete n[review.id]; return n; })} className="min-h-[44px] rounded-full px-3 text-sm font-medium text-primary hover:underline" data-testid="button-sample-reset">
              Reset draft
            </button>
          </div>
          <p id="sample-publish-note" className="mt-2 text-xs text-muted-foreground">Publishing is disabled in this sample. In the product, a team member reviews and deliberately publishes each reply.</p>
        </div>
      </div>
    </div>
  );
}

const STEPS: Record<ExperienceView, { title: string; body: string }[]> = {
  customer: [
    { title: "Scan or open", body: "A QR code or short link opens in the customer’s normal browser. No app to install." },
    { title: "Share the experience", body: "They pick a rating and a few highlights, and can add optional details in their own words." },
    { title: "Get a draft", body: "The assistant writes a suggestion from what they shared, in their chosen tone and language." },
    { title: "Edit or discard", body: "The draft is theirs. They can rewrite it, regenerate it, or walk away." },
    { title: "Choose whether to continue", body: "Only if they decide to, they copy it and continue to Google. Nothing posts automatically." },
  ],
  business: [
    { title: "Set up a business", body: "Add the business and its Google review destination during guided setup." },
    { title: "Create a campaign", body: "Organise requests by counter, invoice, visit type, or location." },
    { title: "Share a QR or link", body: "Download QR assets or share the short link wherever customers already are." },
    { title: "Inspect interactions", body: "See scans, generated drafts, and Google redirects — honest signals, not guaranteed outcomes." },
    { title: "Manage reviews and replies", body: "Import connected Google reviews, draft a reply, edit it, and publish it deliberately." },
  ],
};

/** Section 7: explanatory walkthrough wired to the same presentation state. */
export function Walkthrough() {
  const { view, returnToLive } = useExperience();
  const [step, setStep] = useState<Record<ExperienceView, number>>({ customer: 0, business: 0 });
  const steps = STEPS[view];
  const current = steps[step[view]];

  return (
    <section id="walkthrough" aria-labelledby="walkthrough-heading" className="py-20 sm:py-24" data-testid="section-walkthrough">
      <div className="mx-auto max-w-[80rem] px-4 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mk-eyebrow">Walkthrough</p>
            <h2 id="walkthrough-heading" className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">Explore both sides of the experience.</h2>
          </div>
          <ViewSwitch idPrefix="walkthrough" label="Choose a walkthrough view" />
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <ol className="space-y-2" aria-label={`${view === "customer" ? "Customer" : "Business"} steps`}>
            {steps.map((s, i) => {
              const selected = i === step[view];
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setStep((st) => ({ ...st, [view]: i }))}
                    className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors ${selected ? "border-primary/55 bg-primary/10" : "border-border hover:border-primary/30"}`}
                    data-testid={`button-walkthrough-step-${view}-${i}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                    <span className="font-medium">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mk-card relative flex min-h-[16rem] flex-col justify-between p-6 sm:p-8" aria-live="polite">
            <div className="mk-grid-bg pointer-events-none absolute inset-0 rounded-[1.25rem]" aria-hidden />
            <div key={`${view}-${step[view]}`} className="mk-fade-in relative">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <ScanLine className="h-4 w-4 text-primary" aria-hidden /> {view === "customer" ? "Customer" : "Business"} · Step {step[view] + 1} of {steps.length}
              </p>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{current.title}</h3>
              <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">{current.body}</p>
            </div>
            <button
              type="button"
              onClick={() => returnToLive(view)}
              className="group relative mt-8 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              data-testid="button-walkthrough-continue"
            >
              {view === "customer" ? "Continue my draft" : "Explore this business view"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Continue in the live demo — this walkthrough explains it and never starts generation.</p>
      </div>
    </section>
  );
}

const CUSTOMER_ANCHORS = new Set(["review-demo", EXPERIENCE_SECTION_ID]);


/**
 * Hash navigation for the homepage: initial deep links, in-page hash changes
 * and back/forward. `#review-demo` selects Customer View first so the anchor
 * is never inside a hidden panel.
 */
export function HashNavigator() {
  const { setView } = useExperience();
  const setViewRef = useRef(setView);
  setViewRef.current = setView;

  useEffect(() => {
    const go = (focus: boolean) => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      if (CUSTOMER_ANCHORS.has(id)) setViewRef.current("customer");
      window.setTimeout(() => {
        scrollToSection(id, { updateHash: false, onDone: focus ? focusSection : undefined });
      }, 0);
    };
    go(false);
    const onNav = () => go(true);
    window.addEventListener("hashchange", onNav);
    window.addEventListener("popstate", onNav);
    return () => {
      window.removeEventListener("hashchange", onNav);
      window.removeEventListener("popstate", onNav);
    };
  }, []);
  return null;
}
