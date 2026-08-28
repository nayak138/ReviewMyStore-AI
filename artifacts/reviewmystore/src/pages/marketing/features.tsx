import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { ArrowRight, BarChart3, Check, CheckCircle2, Clock3, ListChecks, MessageCircle, MessageSquareText, Play, QrCode, Search, Settings2, Share2, Smartphone, Star, TrendingUp, Wand2 } from "lucide-react";

export function WhyBusinessesLoveUs() {
  const reasons = [
    { icon: MessageCircle, title: "A better ask", desc: "Give customers one clear, friendly path to share what went well.", accent: "text-google-blue bg-google-blue/10 border-google-blue/20" },
    { icon: Clock3, title: "Less follow-up", desc: "Make review collection part of the moments you already have.", accent: "text-google-red bg-google-red/10 border-google-red/20" },
    { icon: TrendingUp, title: "Steadier growth", desc: "See what is working and build a reputation that compounds.", accent: "text-google-yellow bg-google-yellow/10 border-google-yellow/25" },
    { icon: ListChecks, title: "One calm inbox", desc: "Keep reviews, replies, campaigns and locations in one place.", accent: "text-google-green bg-google-green/10 border-google-green/20" },
  ];
  return (
    <section className="border-b border-border bg-secondary/35 py-20 lg:py-28">
      <div className="container mx-auto grid gap-14 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-24 lg:px-8">
        <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Why it works</p><h2 className="max-w-sm font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Reputation growth, made human.</h2><p className="mt-6 max-w-md leading-relaxed text-muted-foreground">The best review tools disappear into your day. ReviewMyStore.ai keeps the setup simple, the ask natural, and the work easy to see.</p></div>
         <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">{reasons.map(({ icon: Icon, title, desc, accent }) => <div key={title} className="border-t border-border pt-4"><div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-lg border ${accent}`}><Icon className="h-4 w-4" /></div><h3 className="text-base font-bold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{desc}</p></div>)}</div>
      </div>
    </section>
  );
}

export function FeaturesGrid() {
  const features = [
    { icon: Wand2, title: "AI review drafts", desc: "Give customers a useful starting point for a specific, genuine review.", accent: "text-google-blue bg-google-blue/10 border-google-blue/20" },
    { icon: MessageSquareText, title: "Thoughtful replies", desc: "Draft responses in your voice, then review and send when ready.", badge: "Roadmap", accent: "text-google-red bg-google-red/10 border-google-red/20" },
    { icon: ListChecks, title: "Review management", desc: "Keep feedback organized and respond without losing the thread.", accent: "text-google-yellow bg-google-yellow/10 border-google-yellow/25" },
    { icon: QrCode, title: "QR campaigns", desc: "Create a link for every counter, receipt, package or campaign.", accent: "text-google-green bg-google-green/10 border-google-green/20" },
    { icon: Smartphone, title: "NFC collection", desc: "Let customers tap their phone and arrive at the right page.", accent: "text-google-blue bg-google-blue/10 border-google-blue/20" },
    { icon: BarChart3, title: "Simple insights", desc: "Understand which locations and touchpoints are earning trust.", accent: "text-google-red bg-google-red/10 border-google-red/20" },
  ];
  return (
    <section id="features" className="bg-background py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Everything in its place</p><h2 className="max-w-xl font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">The essentials for a stronger presence on Google.</h2></div><p className="max-w-md text-base leading-relaxed text-muted-foreground lg:justify-self-end">From the first tap to the final reply, each tool is designed to make a real customer relationship easier to continue.</p></div>
        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
           {features.map(({ icon: Icon, title, desc, badge, accent }) => <div key={title} className="group bg-card p-7 transition-colors duration-300 hover:bg-secondary/40"><div className="mb-12 flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-background ${accent}`}><Icon className="h-5 w-5" /></div>{badge && <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{badge}</span>}</div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{desc}</p></div>)}
        </div>
        <div className="mt-8 flex justify-center"><a href="#solutions" onClick={(e) => { e.preventDefault(); document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary/75">See how it comes together <ArrowRight className="h-4 w-4" /></a></div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: Search, title: "Find your place", desc: "Choose your business from Google." },
    { icon: Settings2, title: "Set your rhythm", desc: "Create a campaign that fits your day." },
    { icon: Share2, title: "Share the link", desc: "Use QR, NFC or a simple URL." },
    { icon: Star, title: "Keep the trust", desc: "Collect reviews and respond well." },
  ];
  return <section className="border-y border-border bg-secondary/35 py-20 lg:py-24"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><div className="mb-14 max-w-xl"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">A small system with a clear outcome</p><h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">From good service to a review in four steps.</h2></div><div className="grid gap-8 md:grid-cols-4">{steps.map(({ icon: Icon, title, desc }, index) => <div key={title} className="relative border-t border-border pt-4"><div className="mb-8 flex items-center justify-between"><span className="text-xs font-bold text-muted-foreground">0{index + 1}</span><Icon className="h-5 w-5 text-primary" /></div><h3 className="text-base font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p></div>)}</div></div></section>;
}

export function DashboardShowcase() {
  return (
    <section id="solutions" className="bg-background py-24 lg:py-32">
      <div className="container mx-auto grid gap-16 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-24 lg:px-8">
        <div className="order-2 lg:order-1"><div className="rounded-2xl border border-border bg-card p-4 shadow-[0_30px_70px_-48px_hsl(var(--foreground)/0.6)] sm:p-6"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Review inbox</p><p className="mt-1 text-sm font-semibold">The Daily Standard</p></div><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">12 open</span></div><div className="space-y-3 pt-4">{[["AM", "The team made the whole experience feel easy.", "New"], ["JR", "Fast service and a genuinely kind welcome.", "Replied"], ["SK", "Exactly what I needed. I will be back.", "New"]].map(([initials, quote, status]) => <div key={quote} className="flex items-start gap-3 rounded-lg border border-border p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{initials}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="inline-flex gap-0.5 text-amber-500" aria-label="Five star review">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-2.5 w-2.5 fill-current" />)}</span><span className="text-[10px] font-semibold text-muted-foreground">{status}</span></div><p className="mt-2 truncate text-xs text-foreground/80">{quote}</p><p className="mt-2 text-[10px] text-muted-foreground">Google · today</p></div></div>)}</div></div></div>
        <div className="order-1 lg:order-2"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">For the whole team</p><h2 className="max-w-lg font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A clear view of every customer signal.</h2><p className="mt-6 max-w-md leading-relaxed text-muted-foreground">Bring the review link, QR campaigns, customer feedback and response workflow into one straightforward home.</p><ul className="mt-8 space-y-4">{["Unified review inbox", "AI drafts with your approval", "Campaigns for every touchpoint", "Multi-location visibility"].map((item) => <li key={item} className="flex items-center gap-3 text-sm font-semibold"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" />{item}</li>)}</ul><div className="mt-10 flex flex-col gap-4 border-t border-border pt-7 sm:flex-row sm:items-center"><Link href="/sign-up" className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">See it in action <ArrowRight className="ml-2 h-4 w-4" /></Link><BookDemoDialog><Button variant="ghost" className="h-11 justify-start px-2 text-sm font-semibold text-foreground hover:bg-secondary"><Play className="mr-2 h-4 w-4 fill-current text-primary" /> Watch a 2 min overview</Button></BookDemoDialog></div></div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return <section className="bg-secondary/35 px-4 pb-24 sm:px-6 lg:px-8"><div className="container mx-auto border-y border-border py-20 text-center lg:py-24"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Start with the place you know best</p><h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Make it easier for happy customers to speak up.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">Start your free trial, choose your business, and share your first review link today.</p><div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link href="/sign-up" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link><BookDemoDialog><Button variant="outline" className="h-12 w-full rounded-lg px-6 text-sm font-semibold sm:w-auto">Book a demo</Button></BookDemoDialog></div><div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />14-day free trial</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />No credit card</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />Cancel anytime</span></div></div></section>;
}