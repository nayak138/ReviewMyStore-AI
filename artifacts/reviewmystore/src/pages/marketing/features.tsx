import { useRef, useState, type KeyboardEvent } from "react";
import { BarChart3, Building2, Check, Inbox, MessageSquareReply, Minus, QrCode, Sparkles } from "lucide-react";
import { SAMPLE_BUSINESSES, SAMPLE_DATA_LABEL } from "./business-fixtures";
import { HowItWorksLink, ReassuranceGroup, TrialCta } from "./hero";

function SectionHead({ eyebrow, title, id, children }: { eyebrow: string; title: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="mk-eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

/** Section 4 — retains the #approach deep link. */
export function WhyBusinessesLoveUs() {
  return (
    <section id="approach" aria-labelledby="approach-heading" className="py-20 sm:py-24" data-testid="section-approach">
      <div className="mx-auto grid max-w-[80rem] gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
        <SectionHead eyebrow="The problem" title="Review requests are inconsistent." id="approach-heading" />
        <p className="self-end text-lg leading-relaxed text-muted-foreground">
          Asking relies on someone remembering at the right moment. Customers who do agree start from a blank page. And the team has no repeatable way to follow up, read what comes back, and reply well.
        </p>
      </div>
    </section>
  );
}

export const MODULES = [
  { key: "ai", icon: Sparkles, name: "AI Review Assistant", body: "Helps customers put their own experience into an editable draft — never a scripted endorsement.", action: "Customers rate, pick highlights and get a draft they can rewrite in their language.", limit: "Never submits a review for anyone, and cannot guarantee positive reviews or ranking changes." },
  { key: "qr", icon: QrCode, name: "QR & Review Links", body: "Campaign QR codes and short links that open in any browser, with downloadable assets.", action: "Create a campaign, download its QR code, or share the short link.", limit: "A browser flow — no app install. Placement and printing are up to you." },
  { key: "inbox", icon: Inbox, name: "Review Inbox", body: "Import and read connected Google reviews in one place.", action: "Connect Google, import reviews and filter what needs attention.", limit: "Depends on your Google connection and included usage; not every review site." },
  { key: "replies", icon: MessageSquareReply, name: "AI Reply Drafts", body: "A suggested reply for each review that your team edits and publishes deliberately.", action: "Generate a suggestion, edit it, then choose to publish.", limit: "No unattended replies — a person always approves." },
  { key: "analytics", icon: BarChart3, name: "Business Analytics", body: "Scans, drafts, Google redirects, imported reviews and replies over time.", action: "Inspect campaign activity and supported reports per business.", limit: "A Google redirect is not a confirmed published review or proven conversion." },
  { key: "agency", icon: Building2, name: "Agency/Multi-location Management", body: "Organise several businesses or locations and switch between them.", action: "Switch businesses, organise campaigns and view available reporting.", limit: "No white-label settings or new branch hierarchy promised." },
] as const;

/** Section 5. */
export function FeaturesGrid() {
  return (
    <section id="features" aria-labelledby="features-heading" className="py-20 sm:py-24" data-testid="section-features">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <SectionHead eyebrow="Product" title="One reputation system." id="features-heading" />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ key, icon: Icon, name, body }, i) => (
            <li key={key} className={`mk-card mk-card-hover p-6 ${i === 0 ? "lg:col-span-2" : ""} ${i === 5 ? "lg:col-span-2" : ""}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-secondary text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-lg font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const JOURNEYS = [
  { title: "Customer", steps: ["Scan or open the link", "Share an experience", "Get a draft", "Edit it", "Choose whether to continue to Google"] },
  { title: "Business", steps: ["Set up a business", "Create a campaign", "Share a QR code or link", "Inspect interactions", "Manage reviews and replies"] },
];

/** Section 6. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="border-y border-border/70 bg-secondary/25 py-20 sm:py-24" data-testid="section-how-it-works">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <SectionHead eyebrow="Two journeys" title="How it works." id="how-heading" />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {JOURNEYS.map((j) => (
            <div key={j.title} className="mk-card p-6 sm:p-8">
              <h3 className="text-lg font-semibold">{j.title}</h3>
              <ol className="mt-6 space-y-0">
                {j.steps.map((s, i) => (
                  <li key={s} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < j.steps.length - 1 && <span className="absolute left-[0.9rem] top-8 h-[calc(100%-1.75rem)] w-px bg-border" aria-hidden />}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/40 text-xs font-bold tabular-nums text-primary">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMPARISON = [
  ["Ad-hoc asks that depend on memory", "A reusable QR code or link per campaign"],
  ["Customers facing a blank page", "A guided draft from what they shared"],
  ["Pressure to post something", "Customers keep control of the final words"],
  ["Follow-up scattered across inboxes", "Organised review inbox and reply drafts"],
];

/** Section 8. */
export function ComparisonSection() {
  return (
    <section id="comparison" aria-labelledby="comparison-heading" className="py-20 sm:py-24" data-testid="section-comparison">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <h2 id="comparison-heading" className="font-display text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Without 5-Star.AI / With 5-Star.AI</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
          <div className="bg-background p-6 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Without 5-Star.AI</h3>
            <ul className="mt-5 space-y-4">{COMPARISON.map(([a]) => <li key={a} className="flex gap-3 text-muted-foreground"><Minus className="mt-1 h-4 w-4 shrink-0" aria-hidden />{a}</li>)}</ul>
          </div>
          <div className="bg-[hsl(var(--primary)/0.06)] p-6 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">With 5-Star.AI</h3>
            <ul className="mt-5 space-y-4">{COMPARISON.map(([, b]) => <li key={b} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />{b}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const TOOL_LABELS: Record<string, string> = { ai: "AI", qr: "QR", inbox: "Reviews", replies: "Replies", analytics: "Analytics", agency: "Multi-location" };

/** Section 9 — accessible tabs over the capability map. */
export function ToolDeepDive() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const mod = MODULES[active];
  const Icon = mod.icon;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = MODULES.length;
    const map: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    setActive(map[e.key]);
    refs.current[map[e.key]]?.focus();
  };
  return (
    <section id="tools" aria-labelledby="tools-heading" className="border-y border-border/70 bg-secondary/25 py-20 sm:py-24" data-testid="section-tools">
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <SectionHead eyebrow="Details" title="A closer look at the tools." id="tools-heading" />
        <div role="tablist" aria-label="Tools" className="mt-10 flex flex-wrap gap-2">
          {MODULES.map((m, i) => (
            <button key={m.key} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`tool-tab-${m.key}`} aria-selected={i === active} aria-controls="tool-panel" tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)} data-testid={`tab-tool-${m.key}`}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors ${i === active ? "border-foreground bg-foreground text-background" : "border-border text-foreground/75 hover:border-primary/40"}`}>
              {TOOL_LABELS[m.key]}
            </button>
          ))}
        </div>
        <div id="tool-panel" role="tabpanel" aria-labelledby={`tool-tab-${mod.key}`} className="mk-card mt-5 grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr_1fr]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary"><Icon className="h-6 w-6" aria-hidden /></span>
          <div key={`a-${mod.key}`} className="mk-fade-in">
            <h3 className="text-lg font-semibold">{mod.name}</h3>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">What you can do</p>
            <p className="mt-1.5 leading-relaxed">{mod.action}</p>
          </div>
          <div key={`b-${mod.key}`} className="mk-fade-in rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Boundary</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{mod.limit}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 10. */
export function DashboardShowcase() {
  return (
    <section id="agencies" aria-labelledby="agencies-heading" className="py-20 sm:py-24" data-testid="section-agencies">
      <div className="mx-auto grid max-w-[80rem] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div>
          <SectionHead eyebrow="For agencies" title="For agencies managing more than one business." id="agencies-heading" />
          <ul className="mt-8 space-y-4">
            {[
              ["Business switching", "Move between the businesses and locations you manage from one account."],
              ["Campaign organisation", "Keep QR codes and links grouped per business and purpose."],
              ["Available reporting", "Inspect supported activity and review reporting across businesses."],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong className="font-semibold">{t}.</strong> <span className="text-muted-foreground">{b}</span></span></li>
            ))}
          </ul>
        </div>
        <figure className="mk-card min-w-0" aria-label="Illustrative agency overview with sample data">
          <figcaption className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-xs">
            <span className="font-semibold">Businesses</span>
            <span className="rounded-full bg-[hsl(var(--mk-violet)/0.12)] px-2.5 py-1 font-semibold text-[hsl(var(--mk-violet))]" data-testid="label-agency-sample">{SAMPLE_DATA_LABEL}</span>
          </figcaption>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Business</th><th className="hidden px-2 py-3 font-medium sm:table-cell">Campaign</th><th className="px-5 py-3 text-right font-medium">Drafts</th></tr></thead>
            <tbody>
              {SAMPLE_BUSINESSES.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-5 py-3.5"><span className="block font-medium">{b.name}</span><span className="text-xs text-muted-foreground">{b.kind}</span></td>
                  <td className="hidden px-2 py-3.5 text-xs text-muted-foreground sm:table-cell">{b.campaign}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{b.activity[1].value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>
    </section>
  );
}

/** Section 15. */
export function CtaBand() {
  return (
    <section id="start" aria-labelledby="start-heading" className="px-5 pb-20 sm:px-8 lg:px-10" data-testid="section-cta">
      <div className="relative mx-auto max-w-[80rem] rounded-[2rem] border border-border px-6 py-16 text-center sm:px-12 sm:py-20">
        <div className="mk-grid-bg pointer-events-none absolute inset-0 rounded-[2rem]" aria-hidden />
        <div className="mk-hairline absolute inset-x-8 top-0" aria-hidden />
        <div className="relative">
          <h2 id="start-heading" className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">Start your 7-day free trial.</h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <TrialCta testId="button-final-trial" />
            <HowItWorksLink testId="link-final-how-it-works" />
          </div>
          <ReassuranceGroup className="mt-8 justify-center" />
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">A guided trial request — no 5-Star.AI account is created. Our team follows up to arrange setup.</p>
        </div>
      </div>
    </section>
  );
}
