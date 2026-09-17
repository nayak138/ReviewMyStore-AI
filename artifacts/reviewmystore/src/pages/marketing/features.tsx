import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Check, CheckCircle2, ClipboardCheck, HeartHandshake, MessageCircle, QrCode, Send, ShieldCheck, Sparkles, Star, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "@/components/book-demo-dialog";

export function WhyBusinessesLoveUs() {
  const reasons = [
    { icon: HeartHandshake, title: "A human hand on the wheel", desc: "We help shape the system around your team, your locations and the moments customers already trust.", color: "text-primary bg-primary/10 border-primary/20" },
    { icon: Target, title: "The right ask, at the right time", desc: "Turn the goodbyes, checkouts and handoffs you already have into simple review moments.", color: "text-accent-foreground bg-accent/25 border-accent/35" },
    { icon: Sparkles, title: "Your voice, not a robot's", desc: "AI does the first draft. Your team keeps the judgment, warmth and final say.", color: "text-success bg-success/10 border-success/20" },
    { icon: ShieldCheck, title: "A partner, not another login", desc: "Get a clear plan, useful reporting and someone to call when reputation matters.", color: "text-foreground bg-secondary border-border" },
  ];
  return (
    <section id="approach" className="border-b border-border bg-secondary/25 py-20 lg:py-28">
      <div className="mx-auto grid max-w-[80rem] gap-14 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-24 lg:px-10">
        <div className="max-w-md"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">The 5-Star approach</p><h2 className="font-display text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Reputation growth, with a human hand on it.</h2><p className="mt-6 leading-relaxed text-muted-foreground">The best systems feel invisible to your customers and obvious to your team. We make the work easier to do well, then stay close enough to keep it moving.</p></div>
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">{reasons.map(({ icon: Icon, title, desc, color }, index) => <motion.div key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: index * 0.08, duration: 0.45 }} className="border-t border-border pt-4"><div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${color}`}><Icon className="h-4 w-4" /></div><h3 className="text-base font-bold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{desc}</p></motion.div>)}</div>
      </div>
    </section>
  );
}

export function FeaturesGrid() {
  const features = [
    { icon: ClipboardCheck, index: "01", title: "A plan built around your business", desc: "We map the customer moments, locations and goals that matter before anything goes live." },
    { icon: QrCode, index: "02", title: "Simple ways to ask", desc: "QR, NFC and shareable links that arrive exactly where a happy customer is ready to say something." },
    { icon: MessageCircle, index: "03", title: "Reviews handled thoughtfully", desc: "Keep feedback in one calm place. Spot what needs a reply and what needs a deeper look." },
    { icon: BarChart3, index: "04", title: "A clearer view of momentum", desc: "See which locations and touchpoints are creating trust, without drowning in dashboards." },
    { icon: Send, index: "05", title: "Drafts your team can own", desc: "AI suggests useful language in your voice. People approve, adjust and keep the relationship real." },
    { icon: UsersRound, index: "06", title: "Support that stays close", desc: "Your trial starts with a conversation and continues with practical help when the details get complex." },
  ];
  return (
    <section className="bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">What we take care of</p>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">The useful parts, connected.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 md:justify-self-end">One reputation rhythm for your team, your customers and every place your name shows up.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, index, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ delay: (i % 3) * 0.06, duration: 0.45 }} className="group space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-200 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{index}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-all duration-150 group-hover:-translate-y-0.5 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"><Icon className="h-5 w-5" /></div>
              </div>
              <h3 className="pt-3 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { number: "1", title: "Scan QR or Tap Link", desc: "Instant customer onboarding with zero app install." },
    { number: "2", title: "AI Drafts the Perfect Review", desc: "Based on rating and keywords selected in 5 seconds." },
    { number: "3", title: "Direct Post to Google", desc: "One-click redirect right to your Google Maps review dialog." },
  ];
  return (
    <section id="how-it-works" className="bg-white px-4 py-12 dark:bg-zinc-900 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 max-w-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">A better working rhythm</p>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">Less software to learn. More reputation to keep.</h2>
        </div>
        <div className="relative ml-3 space-y-8 border-l-2 border-indigo-100 pl-8 dark:border-indigo-950">
          {steps.map(({ number, title, desc }, index) => (
            <motion.div key={number} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ delay: index * 0.1 }} className="relative">
              <span className="absolute -left-[49px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">{number}</span>
              <h3 className="mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-xs leading-normal text-zinc-600 dark:text-zinc-400">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardShowcase() {
  return (
    <section id="agencies" className="bg-background py-24 lg:py-32">
      <div className="mx-auto grid max-w-[80rem] gap-16 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-24 lg:px-10">
        <div className="order-2 lg:order-1">
          <div className="relative rounded-[1.5rem] border border-border bg-secondary/35 p-4 shadow-[0_30px_70px_-50px_hsl(var(--foreground)/0.6)] sm:p-6">
            <div className="absolute -right-3 -top-4 rounded-xl border border-border bg-card px-3 py-2 shadow-[0_15px_30px_-22px_hsl(var(--foreground)/0.7)] sm:-right-7"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Agency view</p><p className="mt-1 text-sm font-bold">12 locations · 4 clients</p></div>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Client portfolio</p><p className="mt-1 font-display text-xl font-semibold">Reputation at a glance</p></div><span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">This month</span></div><div className="mt-5 space-y-3"><AgencyRow name="The Daily Standard" places="3 locations" value="4.9" delta="+18 reviews" tone="bg-primary" /><AgencyRow name="Northline Dental" places="1 location" value="4.8" delta="+11 reviews" tone="bg-accent" /><AgencyRow name="Marlow House" places="8 locations" value="4.7" delta="+26 reviews" tone="bg-success" /></div><div className="mt-5 rounded-xl border border-border bg-background p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">Signal over time</p><span className="text-[10px] text-muted-foreground">Review volume</span></div><svg viewBox="0 0 600 120" className="h-28 w-full" role="img" aria-label="Review volume trending upward"><path d="M0 98H600M0 58H600M0 18H600" stroke="hsl(var(--border))" strokeDasharray="3 7" /><path d="M0 93 C55 86 75 90 119 83 S185 88 225 67 S286 74 334 64 S397 69 439 44 S516 51 600 18" fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" /><circle cx="439" cy="44" r="5" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="3" /></svg></div></div>
          </div>
        </div>
        <div className="order-1 lg:order-2"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Built for the people behind the work</p><h2 className="max-w-lg font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">For agencies, it is the layer that makes good work stick.</h2><p className="mt-6 max-w-md leading-relaxed text-muted-foreground">Give every client a better reputation rhythm without adding another heavy platform to your delivery model.</p><ul className="mt-8 space-y-4">{["One view across every client and location", "Branded review moments your clients can own", "Clear reporting for the next client conversation", "A partner who understands the messy middle"].map((item) => <li key={item} className="flex items-start gap-3 text-sm font-semibold"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />{item}</li>)}</ul><div className="mt-10 border-t border-border pt-7"><BookDemoDialog><Button data-testid="button-agency-book-demo" className="h-12 rounded-full bg-foreground px-5 font-semibold text-background hover:bg-foreground/90">Talk through your client mix <ArrowRight className="ml-2 h-4 w-4" /></Button></BookDemoDialog></div></div>
      </div>
    </section>
  );
}

function AgencyRow({ name, places, value, delta, tone }: { name: string; places: string; value: string; delta: string; tone: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border p-3"><div className={`h-9 w-1.5 rounded-full ${tone}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{places}</p></div><div className="text-right"><p className="text-sm font-bold">{value}</p><p className="mt-0.5 text-[10px] font-semibold text-success">{delta}</p></div></div>;
}

export function CtaBand() {
  return <section className="bg-secondary/25 px-5 pb-24 sm:px-8 lg:px-10"><div className="mx-auto max-w-[80rem] rounded-[1.5rem] border border-border bg-card px-6 py-16 text-center shadow-[0_25px_60px_-48px_hsl(var(--foreground)/0.55)] sm:px-10 lg:py-24"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Your first seven days</p><h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">Start with a conversation, not a credit card.</h2><p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground">We will learn how your business works, show you the clearest place to begin and help you put the first review moment in motion.</p><div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"><BookDemoDialog><Button data-testid="button-final-book-demo" className="h-12 w-full rounded-full bg-foreground px-6 font-semibold text-background hover:bg-foreground/90 sm:w-auto">Book your strategy call <ArrowRight className="ml-2 h-4 w-4" /></Button></BookDemoDialog><a href="#faq" onClick={(e) => { e.preventDefault(); document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex h-12 items-center px-4 text-sm font-semibold text-foreground/70 hover:text-primary">Read the questions</a></div><div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />7-day free trial</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />White-glove setup</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />No self-serve signup</span></div></div></section>;
}