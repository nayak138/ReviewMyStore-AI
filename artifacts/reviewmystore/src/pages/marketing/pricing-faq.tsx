import { useState } from "react";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookDemoDialog } from "@/components/book-demo-dialog";

export function TestimonialsSection() {
  const testimonials = [
    { name: "Coffee shop owner", role: "Cafés & restaurants", image: "CA", quote: "Place an NFC standee or QR card at the counter and customers can leave a Google review before they've finished their coffee — no searching, no friction." },
    { name: "Clinic director", role: "Clinics & practices", image: "CL", quote: "Patients scan a QR card at checkout and the AI suggests well-written review text — all they do is paste and post." },
    { name: "Salon manager", role: "Salons & spas", image: "SA", quote: "Customers tap their phone while their hair sets, the AI suggests the words, and posting to Google takes one more tap." },
    { name: "Hotel GM", role: "Hotels & hospitality", image: "HO", quote: "Every property runs its own campaigns and QR assets from one account — front desk, restaurant and spa each get their own funnel." },
    { name: "Retail founder", role: "Retail & e-commerce", image: "RE", quote: "Print QR codes on receipts and packaging that route straight to your review page — and update where they point anytime." },
    { name: "Auto shop owner", role: "Auto & services", image: "AU", quote: "A tap-to-review card at the register makes it effortless to ask every happy customer at the right moment." },
  ];
  return (
    <section className="border-y border-border bg-secondary/35 py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">In the field</p><h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Useful at the counter, the desk, and everywhere in between.</h2></div><p className="max-w-md text-base leading-relaxed text-muted-foreground lg:justify-self-end">Different businesses, same simple truth: asking at the right moment makes sharing an experience feel natural.</p></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{testimonials.map((item, index) => <article key={item.name} className={`border border-border bg-card p-6 ${index === 0 ? "lg:col-span-2 lg:p-8" : ""}`}><div className="mb-6 flex items-center justify-between"><span className="inline-flex gap-0.5 text-amber-500" aria-label="Five star review">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3 w-3 fill-current" />)}</span><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">0{index + 1}</span></div><blockquote className={`${index === 0 ? "max-w-2xl text-xl sm:text-2xl" : "text-base"} leading-relaxed text-foreground/85`}>“{item.quote}”</blockquote><div className="mt-8 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{item.image}</div><div><p className="text-sm font-bold">{item.name}</p><p className="text-xs text-muted-foreground">{item.role}</p></div></div></article>)}</div>
      </div>
    </section>
  );
}

export function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const [, setLocation] = useLocation();
  const plans = [
    { name: "Starter", desc: "For a single location getting started.", price: annual ? "29" : "39", features: ["1 Location", "AI review text suggestions", "Basic QR Code Generator", "Email Support"] },
    { name: "Growth", desc: "For growing businesses with more than one location.", price: annual ? "79" : "99", features: ["Up to 3 Locations", "Unlimited AI suggestions", "Dynamic QR & NFC Ready", "Priority Support", "Custom Branding"], highlight: true },
    { name: "Agency", desc: "For agencies managing multiple clients.", price: annual ? "199" : "249", features: ["Up to 10 Locations", "Manage Multiple Clients", "Dedicated Success Manager", "White-label & Reporting"] },
    { name: "Enterprise", desc: "For large franchises and custom needs.", price: "Custom", features: ["Unlimited Locations", "Volume Pricing", "Personalized Onboarding", "Custom Integrations & SSO"], isCustom: true },
  ];
  return (
    <section id="pricing" className="bg-background py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col justify-between gap-8 border-b border-border pb-10 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Pricing</p><h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Straightforward plans.<br className="hidden sm:block" /> No surprises while we build.</h2><p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">Paid plans are planned, not live yet. During early access, sign up and use the full platform at no cost.</p></div><div className="inline-flex shrink-0 rounded-lg border border-border bg-secondary/50 p-1" role="group" aria-label="Billing period"><button type="button" data-testid="button-monthly-pricing" onClick={() => setAnnual(false)} className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${!annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button><button type="button" data-testid="button-yearly-pricing" onClick={() => setAnnual(true)} className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Yearly <span className="ml-1 text-[10px] text-success">Save 20%</span></button></div></div>
        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2 lg:grid-cols-4">{plans.map((plan) => <div key={plan.name} className={`relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary/35 lg:p-7 ${plan.highlight ? "ring-2 ring-inset ring-primary" : ""}`}>{plan.highlight && <span className="absolute right-5 top-5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-foreground">Most popular</span>}<h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-2 min-h-12 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">{plan.desc}</p><div className="my-8">{plan.isCustom ? <span className="font-display text-3xl font-semibold">Let’s talk</span> : <><span className="font-display text-4xl font-semibold">${plan.price}</span><span className="text-sm text-muted-foreground"> / mo</span><p className="mt-1 text-[10px] text-muted-foreground">Planned price · free in early access</p></>}</div><ul className="mb-8 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{feature}</li>)}</ul>{plan.isCustom ? <BookDemoDialog><Button variant="outline" className="w-full rounded-lg">Contact Sales</Button></BookDemoDialog> : <Button data-testid={`button-pricing-${plan.name.toLowerCase()}`} variant={plan.highlight ? "default" : "outline"} onClick={() => setLocation("/sign-up")} className="w-full rounded-lg">{plan.name === "Enterprise" ? "Contact Sales" : "Start Free"}</Button>}</div>)}</div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const faqs = [
    { q: "Do customers need to download an app to leave a review?", a: "No. NFC tags and QR codes use native smartphone technology. Tapping or scanning opens their web browser directly to your Google Review page." },
    { q: "Can I use ReviewMyStore.AI for multiple locations?", a: "Yes. Our Growth plan and above support multi-location businesses. You can manage all of your Google Business profiles from a single dashboard." },
    { q: "How does the AI review generation work?", a: "When a customer scans your code, our AI can optionally suggest personalized text based on your business type, making it easier to leave a high-quality, descriptive review." },
    { q: "Do you respond to reviews automatically?", a: "Not yet — AI-drafted replies are on our roadmap. When it launches, the AI will draft a context-aware response in your brand voice, and you'll always edit and approve it before anything is published." },
    { q: "How do I get the physical NFC standees?", a: "You can use any standard NFC tags, cards, or standees — register them in your dashboard and assign them to a campaign in seconds. We also provide high-resolution QR codes you can print yourself instantly." },
  ];
  return <section id="faq" className="bg-background py-24 lg:py-28"><div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"><div className="mb-12"><p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">Questions, answered</p><h2 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Before you begin.</h2></div><Accordion type="single" collapsible className="w-full">{faqs.map((faq, index) => <AccordionItem key={faq.q} value={`item-${index}`} className="border-border"><AccordionTrigger className="py-6 text-left text-base font-semibold hover:no-underline hover:text-primary">{faq.q}</AccordionTrigger><AccordionContent className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{faq.a}</AccordionContent></AccordionItem>)}</Accordion></div></section>;
}