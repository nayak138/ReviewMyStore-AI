import { 
  Sparkles, MessageSquare, QrCode, Smartphone, BarChart3, 
  MapPin, Printer, Building2, Target, Globe, Zap, ShieldCheck, CheckCircle2, Star 
} from "lucide-react";

export function FeaturesGrid() {
  const features = [
    { icon: <Sparkles className="w-6 h-6" />, title: "AI Review Generation", desc: "Suggests high-quality review text for customers automatically.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: <MessageSquare className="w-6 h-6" />, title: "Google Review Management", desc: "A powerful inbox to read, filter, and reply to all your reviews.", color: "text-emerald-500", bg: "bg-emerald-500/10", soon: true },
    { icon: <Zap className="w-6 h-6" />, title: "AI Smart Reply", desc: "Drafts context-aware, personalized replies to reviews instantly.", color: "text-amber-500", bg: "bg-amber-500/10", soon: true },
    { icon: <QrCode className="w-6 h-6" />, title: "QR Review Campaigns", desc: "Dynamic QR codes that route directly to your Google review modal.", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { icon: <Smartphone className="w-6 h-6" />, title: "NFC Review Collection", desc: "Register your own NFC tags and cards. Tap to review with no app required.", color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: <Target className="w-6 h-6" />, title: "Campaign Management", desc: "Organize different collection strategies across your stores.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { icon: <Globe className="w-6 h-6" />, title: "Dynamic QR Redirects", desc: "Update where your QR codes point without reprinting them.", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Analytics Dashboard", desc: "Track taps, scans, conversion rates, and rating growth.", color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", soon: true },
    { icon: <Building2 className="w-6 h-6" />, title: "Multi-location Ready", desc: "Manage reputation for hundreds of stores from one central hub.", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: <Printer className="w-6 h-6" />, title: "Printable Assets", desc: "Download high-res PNG, SVG, and PDF assets for your marketing.", color: "text-teal-500", bg: "bg-teal-500/10" },
    { icon: <MapPin className="w-6 h-6" />, title: "Business Discovery", desc: "Auto-syncs data, photos, and live ratings from Google Places.", color: "text-pink-500", bg: "bg-pink-500/10" },
    { icon: <ShieldCheck className="w-6 h-6" />, title: "Keyword Protection", desc: "Monitor sentiment and ensure staff maintain brand standards.", color: "text-sky-500", bg: "bg-sky-500/10", soon: true },
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-foreground">A complete reputation engine</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to build trust, collect feedback, and outrank your competitors on Google Maps — all powered by AI.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group relative p-6 bg-card border border-border rounded-2xl hover:shadow-lg transition-all hover:border-primary/30">
              {f.soon && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                  Coming soon
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.bg} ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductShowcase() {
  const sections = [
    {
      title: "Powerful Campaign Management",
      desc: "Create and track multiple review collection campaigns. Generate custom QR codes and pair NFC devices effortlessly.",
      tag: "Campaigns",
      image: (
        <div className="w-full h-full bg-card border-border rounded-xl p-4 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="h-32 flex-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4 relative overflow-hidden">
              <div className="text-indigo-600 dark:text-indigo-400 font-medium mb-1">Summer Promo</div>
              <div className="text-2xl font-bold text-foreground">1.2k Scans</div>
              <div className="absolute right-2 bottom-2"><QrCode className="w-12 h-12 opacity-20 text-indigo-500" /></div>
            </div>
            <div className="h-32 flex-1 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 relative overflow-hidden">
              <div className="text-rose-600 dark:text-rose-400 font-medium mb-1">Front Desk NFC</div>
              <div className="text-2xl font-bold text-foreground">845 Taps</div>
              <div className="absolute right-2 bottom-2"><Smartphone className="w-12 h-12 opacity-20 text-rose-500" /></div>
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-muted/30 border border-border p-4">
            <div className="h-4 w-1/3 bg-muted rounded mb-4"></div>
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-background border border-border rounded w-full"></div>)}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Multi-Location Control",
      desc: "Manage all your storefronts from a single dashboard — each location gets its own campaigns, QR assets, and review funnel.",
      tag: "Businesses",
      image: (
        <div className="w-full h-full bg-card border-border rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <div className="h-6 w-32 bg-muted rounded"></div>
            <div className="h-8 w-24 bg-primary rounded"></div>
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-3 border border-border rounded-lg bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-muted"></div>
                  <div>
                    <div className="h-3 w-24 bg-foreground/20 rounded mb-1"></div>
                    <div className="h-2 w-32 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-medium text-sm">
                  4.9 <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <section id="solutions" className="py-24 bg-zinc-50 dark:bg-zinc-900/20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="space-y-32">
          {sections.map((section, idx) => (
            <div key={idx} className={`flex flex-col ${idx % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  {section.tag}
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">{section.title}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">{section.desc}</p>
                <ul className="space-y-3 pt-4">
                  {[1,2,3].map(i => (
                    <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <span className="h-4 w-48 bg-muted rounded"></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-2xl transform rotate-2"></div>
                <div className="relative bg-background border border-border shadow-2xl rounded-2xl h-[400px] overflow-hidden">
                  {section.image}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


export function AiWorkflow() {
  const steps = [
    { title: "Customer Scans", icon: <QrCode className="w-8 h-8" />, desc: "Taps NFC or scans QR." },
    { title: "AI Drafts Review", icon: <Sparkles className="w-8 h-8" />, desc: "Instantly suggests praise." },
    { title: "Customer Posts to Google", icon: <MessageSquare className="w-8 h-8" />, desc: "They copy the AI draft and post it themselves on Google." },
    { title: "Your Reputation Grows", icon: <Zap className="w-8 h-8" />, desc: "Track scans, taps and campaign performance." },
  ];

  return (
    <section className="py-24 bg-background border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-16 text-foreground">The automated reputation loop</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center w-full md:w-1/4">
              <div className="w-16 h-16 rounded-full bg-card border-2 border-primary text-primary flex items-center justify-center mb-4 shadow-lg relative z-10">
                {step.icon}
              </div>
              <h4 className="font-semibold text-foreground mb-2">{step.title}</h4>
              <p className="text-sm text-muted-foreground px-4">{step.desc}</p>
              
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-64px)] h-0.5 bg-border -z-0">
                  <div className="h-full bg-primary/50 animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
