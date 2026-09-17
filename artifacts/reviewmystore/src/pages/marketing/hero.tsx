import { motion } from "framer-motion";
import { ArrowRight, Check, Circle, MessageSquareText, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { BrandIcon } from "@/components/brand-logo";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-slate-50 px-4 py-12 dark:border-zinc-800 dark:bg-slate-950 sm:py-16">
      <div className="editorial-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid min-w-0 w-full max-w-5xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-12">
        <div className="min-w-0 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> 7-day free trial · white-glove setup
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.65 }} className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Your reputation should feel <span className="relative inline-block text-primary"><span className="relative z-10">looked after.</span><span className="absolute bottom-1 left-0 right-0 -z-0 h-3 -rotate-2 bg-accent/45" /></span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.6 }} className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:max-w-lg sm:text-base">
            5-Star.AI is the reputation partner behind the scenes — helping local businesses and agencies turn great customer moments into stronger Google presence.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.6 }} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BookDemoDialog>
               <Button data-testid="button-hero-book-demo" className="min-h-[44px] w-full rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-150 hover:bg-indigo-700 active:scale-95 sm:w-auto sm:px-6">
                See what a better system looks like <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </BookDemoDialog>
             <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex min-h-[44px] items-center justify-center gap-2 px-2 text-sm font-semibold text-zinc-600 transition-all duration-150 hover:text-indigo-600 active:scale-95 dark:text-zinc-400 dark:hover:text-indigo-300">
              How it works <span aria-hidden="true">↓</span>
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42, duration: 0.6 }} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
             {["No credit card", "Built for real teams", "Cancel anytime"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" />{item}</span>)}
          </motion.div>
        </div>
        <HeroDeskVisual />
      </div>
    </section>
  );
}

function HeroDeskVisual() {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.75 }} className="relative mx-auto min-w-0 w-full max-w-[37rem] lg:justify-self-end">
      <div className="absolute -left-5 top-10 hidden h-28 w-28 rounded-full border border-primary/20 lg:block" aria-hidden="true" />
      <div className="relative rounded-[1.7rem] border border-foreground/10 bg-card p-3 shadow-[0_35px_80px_-42px_hsl(var(--foreground)/0.6)] sm:p-5">
        <div className="rounded-[1.15rem] border border-border bg-background p-5 sm:p-6">
          <div className="flex items-start justify-between border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <BrandIcon className="h-10 w-10 rounded-xl object-cover" alt="" />
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Reputation desk</p><p className="mt-1 font-display text-xl font-semibold tracking-tight">The Local Standard</p></div>
            </div>
            <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">On track</span>
          </div>
          <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-3">
            <DeskMetric label="New reviews" value="48" note="this month" />
            <DeskMetric label="Average rating" value="4.9" note="across 3 locations" />
            <DeskMetric label="Replies drafted" value="31" note="ready to approve" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold">Latest signals</p><span className="text-[10px] font-semibold text-muted-foreground">Updated just now</span></div>
            <div className="space-y-3">
              <DeskReview initials="AM" quote="The team made the whole experience feel easy." status="Ready to post" color="bg-primary/12 text-primary" />
              <DeskReview initials="JR" quote="Fast service and a genuinely kind welcome." status="Reply drafted" color="bg-accent/35 text-accent-foreground" />
            </div>
          </div>
        </div>
      </div>
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_22px_45px_-30px_hsl(var(--foreground)/0.7)] sm:-left-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
        <div><p className="text-xs font-bold">A thoughtful follow-up</p><p className="mt-0.5 text-[10px] text-muted-foreground">Drafted in your voice</p></div>
      </motion.div>
    </motion.div>
  );
}

function DeskMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] font-medium text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-semibold">{value}</p><p className="mt-1 text-[10px] font-medium text-success">{note}</p></div>;
}

function DeskReview({ initials, quote, status, color }: { initials: string; quote: string; status: string; color: string }) {
  return <div className="flex items-start gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${color}`}>{initials}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="inline-flex gap-0.5 text-warning" aria-label="Five star review">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-2.5 w-2.5 fill-current" />)}</span><span className="text-[10px] font-semibold text-muted-foreground">{status}</span></div><p className="mt-1 truncate text-xs text-foreground/75">{quote}</p></div></div>;
}

export function TrustedBySection() {
  return <section className="border-b border-border bg-secondary/25 py-7"><div className="mx-auto flex max-w-[80rem] flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-left">For teams who take the long view</p><div className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm font-semibold text-foreground/55 md:justify-end"><span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Local operators</span><span className="flex items-center gap-2"><Circle className="h-2.5 w-2.5 fill-current text-accent" /> Growth agencies</span><span className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-success" /> Multi-location teams</span></div></div></section>;
}