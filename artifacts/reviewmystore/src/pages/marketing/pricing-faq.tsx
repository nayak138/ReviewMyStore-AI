import { useState } from "react";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const [, setLocation] = useLocation();

  const plans = [
    {
      name: "Starter",
      desc: "For single-location businesses just getting started.",
      price: annual ? "29" : "39",
      features: ["1 Location", "AI review text suggestions", "Basic QR Code Generator", "Email Support"],
      cta: "Start Free",
      highlight: false
    },
    {
      name: "Growth",
      desc: "For growing businesses with multiple locations.",
      price: annual ? "79" : "99",
      features: ["Up to 3 Locations", "Unlimited AI suggestions", "Dynamic QR & NFC Ready", "Priority Support", "Custom Branding", "Analytics Dashboard (coming soon)"],
      cta: "Start Free",
      highlight: true
    },
    {
      name: "Agency",
      desc: "For agencies managing multiple clients.",
      price: annual ? "199" : "249",
      features: ["Up to 10 Locations", "Manage Multiple Clients", "Dedicated Success Manager", "White-label & Reporting (coming soon)"],
      cta: "Start Free",
      highlight: false
    },
    {
      name: "Enterprise",
      desc: "Custom solutions for large franchises.",
      price: "Custom",
      features: ["Unlimited Locations", "Volume Pricing", "Personalized Onboarding", "Custom Integrations & SSO (roadmap)"],
      cta: "Contact Sales",
      highlight: false,
      isCustom: true
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-emerald-500/20">
            Free during early access
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground mb-8">
            The plans below show our planned pricing — paid plans aren't live yet. Right now, everything is free while we're in early access: sign up and use the full platform at no cost.
          </p>
          <div className="inline-flex items-center p-1 bg-muted rounded-full">
            <button 
              onClick={() => setAnnual(false)} 
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setAnnual(true)} 
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Yearly <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:block">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`relative p-8 rounded-2xl border ${plan.highlight ? 'border-primary shadow-xl bg-card' : 'border-border bg-card hover:border-border/80 shadow-sm'} flex flex-col`}>
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 h-10">{plan.desc}</p>
              <div className="mb-8">
                {plan.isCustom ? (
                  <span className="text-4xl font-bold text-foreground">Let's talk</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                    <div className="text-xs text-muted-foreground mt-1">Planned pricing — free during early access</div>
                  </>
                )}
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={plan.highlight ? "default" : "outline"}
                onClick={() => plan.isCustom ? window.location.href = "mailto:sales@reviewmystore.ai" : setLocation('/sign-up')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const testimonials = [
    { name: "Coffee shop owner", role: "Cafés & restaurants", image: "CA", quote: "Place an NFC standee or QR card at the counter and customers can leave a Google review before they've finished their coffee — no searching, no friction." },
    { name: "Clinic director", role: "Clinics & practices", image: "CL", quote: "Patients scan a QR card at checkout and the AI suggests well-written review text — all they do is paste and post. No awkward asking required." },
    { name: "Salon manager", role: "Salons & spas", image: "SA", quote: "Customers tap their phone while their hair sets, the AI suggests the words, and posting to Google takes one more tap. It's completely frictionless." },
    { name: "Hotel GM", role: "Hotels & hospitality", image: "HO", quote: "Every property runs its own campaigns and QR assets from one account — front desk, restaurant and spa each get their own trackable review funnel." },
    { name: "Retail founder", role: "Retail & e-commerce", image: "RE", quote: "Print QR codes on receipts and packaging that route straight to your review page — and update where they point anytime without reprinting." },
    { name: "Auto shop owner", role: "Auto & services", image: "AU", quote: "Happy customers rarely think to leave a review on their own — a tap-to-review card at the register makes it effortless to ask every single time." }
  ];

  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-900/20 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">Made for businesses like yours</h2>
          <p className="text-lg text-muted-foreground">Example scenarios showing how different industries can put the platform to work, from the counter to the front desk.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="flex text-amber-400 mb-4 gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-foreground/90 leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {t.image}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const faqs = [
    { q: "Do customers need to download an app to leave a review?", a: "No. NFC tags and QR codes use native smartphone technology. Tapping or scanning opens their web browser directly to your Google Review page." },
    { q: "Can I use ReviewMyStore.AI for multiple locations?", a: "Yes. Our Growth plan and above support multi-location businesses. You can manage all your Google Business profiles from a single dashboard." },
    { q: "How does the AI review generation work?", a: "When a customer scans your code, our AI can optionally suggest personalized text based on your business type, making it easier for them to leave a high-quality, descriptive review rather than just a star rating." },
    { q: "Do you respond to reviews automatically?", a: "Not yet — AI-drafted replies are on our roadmap. When it launches, the AI will draft a context-aware response in your brand voice, and you'll always edit and approve it before anything is published." },
    { q: "How do I get the physical NFC standees?", a: "You can use any standard NFC tags, cards, or standees — register them in your dashboard and assign them to a campaign in seconds. We also provide high-resolution QR codes you can print yourself instantly." }
  ];

  return (
    <section id="faq" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline hover:text-primary transition-colors">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none"></div>
      <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6 leading-tight">Ready to Grow Your Google Reputation?</h2>
        <p className="text-xl text-primary-foreground/80 mb-10">
          Start collecting reviews in minutes — AI-powered review generation, QR codes, and NFC in one platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            onClick={() => setLocation('/sign-up')} 
            className="h-14 px-8 text-base font-semibold bg-background text-primary hover:bg-background/90 w-full sm:w-auto shadow-xl"
          >
            Start Free
          </Button>
          <Button 
            asChild
            size="lg" 
            variant="outline" 
            className="h-14 px-8 text-base font-semibold w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground bg-transparent"
          >
            <a href="#solutions">See How It Works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
