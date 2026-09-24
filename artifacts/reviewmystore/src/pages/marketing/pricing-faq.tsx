import { Star } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "@/components/book-demo-dialog";

export function TestimonialsSection() {
  const testimonials = [
    { name: "Maya Patel", role: "Co-founder, The Green Room", initials: "MP", quote: "We stopped treating reviews like a monthly chore. The team helped us find the moments that already worked, then made those moments easier to repeat." },
    { name: "David Lin", role: "Managing partner, Northline Dental", initials: "DL", quote: "What stood out was the judgment. We got a system our front desk could actually use, not another dashboard we had to babysit." },
    { name: "Sofia Romero", role: "Client director, Marlow & Co.", initials: "SR", quote: "It gives our clients something tangible to feel good about. We can talk about reputation with context instead of another vanity metric." },
  ];
  return (
    <section className="bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 grid gap-4 md:grid-cols-[0.82fr_1.18fr] md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">What operators notice</p>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">The difference is in the details.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 md:justify-self-end">A few words from people who need reputation work to happen in the real world, between the phone calls and the next customer.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-0.5 text-sm text-amber-400" aria-label="Five star review">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3.5 w-3.5 fill-current" />)}</div>
              <blockquote className="pt-2 text-xs font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">“{item.quote}”</blockquote>
              <div className="flex items-center gap-3 pt-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{item.initials}</div>
                <div><p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.name}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{item.role} · Verified</p></div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section className="bg-background py-24 lg:py-32">
      <div className="mx-auto grid max-w-[80rem] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-24 lg:px-10">
        <div><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">A considered start</p><h2 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">Seven days to see what changes.</h2><p className="mt-6 max-w-md leading-relaxed text-muted-foreground">Your trial is not a tour of every feature. It is a focused working week with a clear first goal, thoughtful setup and a team who knows what to look for.</p><BookDemoDialog><Button data-testid="button-trial-book-demo" className="mt-8 h-12 rounded-full bg-foreground px-5 font-semibold text-background hover:bg-foreground/90">Plan the first week</Button></BookDemoDialog></div>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">{[
          ["Day 01", "Get clear on the opportunity", "We map where trust is already being earned and where a small change can create a better ask."],
          ["Day 03", "Put the first moment in motion", "Your first review link, QR touchpoint or campaign is ready for the team to use."],
          ["Day 07", "Review the signal together", "We look at what happened, what felt natural and what deserves to become the next habit."],
        ].map(([day, title, desc]) => <div key={day} className="grid gap-4 p-6 sm:grid-cols-[5.5rem_1fr] sm:p-8"><span className="font-mono text-[11px] font-bold tracking-[0.16em] text-primary">{day}</span><div><h3 className="text-lg font-bold tracking-tight">{title}</h3><p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{desc}</p></div></div>)}</div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const faqs = [
    { q: "What does the 7-day free trial include?", a: "It includes an initial working session, a focused setup around your business, access to the 5-Star.AI workflow and a review of the first signals together. We keep the week practical rather than asking your team to learn everything at once. The trial is free and does not automatically convert to a paid service." },
    { q: "Is this a self-serve product?", a: "No. 5-Star.AI is designed as an agency-led service. We work with you to choose the right moments, configure the system and make sure the workflow fits the people who will use it." },
    { q: "Can agencies use 5-Star.AI for multiple clients?", a: "Yes. The agency view is designed for teams supporting multiple businesses and locations, with a clearer way to keep client work organized and useful." },
    { q: "How much does 5-Star.AI cost?", a: "Pricing is custom; there is no fixed public plan price. Before paid service begins, you receive a written quote that states whether billing is per agency account or per business/location, what is included, and how often you will be billed. Nothing is charged or started automatically when the 7-day trial ends." },
    { q: "How do I stop the trial or cancel?", a: "The trial will not turn into a paid service unless you accept a written quote, so there is no automatic renewal to cancel. You can stop the trial or cancel an agreed service by emailing hello@5-star.ai; any notice period or effective date for paid service is stated in your quote." },
    { q: "Do customers need an app to leave a review?", a: "No. QR codes and shareable links open in a customer's regular web browser. The experience is designed to be quick and familiar." },
    { q: "Will AI publish replies without approval?", a: "No. AI can help with a thoughtful first draft, but your team stays in control of the words and the final decision." },
    { q: "What happens after the trial?", a: "We review the week with you and recommend the next step based on fit and opportunity. If you want to continue, we provide a custom written quote covering price, billing unit and included usage. Paid service begins only after you accept it; there is no automatic charge or upgrade." },
  ];
  return <section id="faq" className="bg-background py-24 lg:py-28"><div className="mx-auto max-w-3xl px-5 sm:px-8"><div className="mb-12"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Questions, answered plainly</p><h2 className="font-display text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Before we begin.</h2></div><Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => <AccordionItem key={faq.q} value={`item-${index}`} className="border-border"><AccordionTrigger className="py-6 text-left text-base font-semibold hover:no-underline hover:text-primary">{faq.q}</AccordionTrigger><AccordionContent className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{faq.a}</AccordionContent></AccordionItem>)}</Accordion><div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-border bg-secondary/25 p-6 sm:flex-row sm:items-center sm:p-7"><div><p className="font-semibold">Still deciding if it fits?</p><p className="mt-1 text-sm text-muted-foreground">Bring us the messy version. That is where the useful conversation starts.</p></div><BookDemoDialog><Button data-testid="button-faq-book-demo" variant="outline" className="h-11 shrink-0 rounded-full px-5 font-semibold">Book a conversation</Button></BookDemoDialog></div></div></section>;
}