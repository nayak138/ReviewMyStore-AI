import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { 
  MessageCircle, Clock, TrendingUp, Layers,
  Wand2, MessageSquareText, ListChecks, QrCode, Smartphone, BarChart3,
  Search, Settings, Share2, Star, CheckCircle2, Play,
  Check,
  Sparkles,
  X
} from "lucide-react";

export function WhyBusinessesLoveUs() {
  const reasons = [
    { icon: <MessageCircle className="w-5 h-5 text-blue-500" />, title: "Get More Reviews", desc: "Automate tools that convert customers" },
    { icon: <Clock className="w-5 h-5 text-emerald-500" />, title: "Save Time", desc: "Automate replies and review management" },
    { icon: <TrendingUp className="w-5 h-5 text-purple-500" />, title: "Improve Reputation", desc: "Turn feedback into growth" },
    { icon: <Layers className="w-5 h-5 text-amber-500" />, title: "All in One Platform", desc: "Everything you need in one place" },
  ];

  return (
    <section className="overflow-hidden border-b border-border/50 bg-muted/30 py-24 dark:bg-muted/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left: Find Your Business Mockup */}
          <div className="flex-1 w-full relative">
            <div className="mx-auto max-w-md rounded-3xl border border-border/70 bg-background/90 p-8 shadow-[0_28px_70px_-45px_hsl(var(--foreground)/0.55)] backdrop-blur-sm">
              <h3 className="text-xl font-bold text-foreground mb-2 text-center">Find Your Business</h3>
              <p className="text-sm font-medium text-muted-foreground mb-6 text-center">Start by searching your business on Google</p>
              
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input 
                  type="text" 
                  disabled 
                  placeholder="Search for your business name..." 
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-muted/30 dark:bg-muted/10 text-sm shadow-inner"
                />
              </div>

              <div className="border border-border rounded-xl p-3 flex gap-4 items-center bg-background shadow-sm mb-4">
                <div className="w-14 h-14 bg-muted/80 rounded-lg shrink-0 overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80')] bg-cover bg-center" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">The Coffee House</div>
                  <div className="text-[11px] font-medium text-muted-foreground mt-0.5">123 Brew Street, Mumbai, MH 400001, India</div>
                  <div className="text-[11px] font-bold text-foreground/80 flex items-center gap-1 mt-1">
                    <span className="text-amber-500">4.8</span>
                    <span className="text-amber-400 tracking-tighter">★★★★★</span>
                    <span className="text-muted-foreground/70 font-normal">(1,248 reviews)</span>
                  </div>
                </div>
                <div className="ml-auto text-slate-300">
                  <X className="w-4 h-4" />
                </div>
              </div>

              <p className="text-center text-xs font-semibold text-blue-600 underline decoration-blue-600/30 underline-offset-4">
                Can't find your business?
              </p>
            </div>
          </div>

          {/* Right: Why businesses love... */}
          <div className="flex-1 w-full">
            <h2 className="text-2xl font-bold text-foreground mb-8">Why businesses love ReviewMyStore.ai</h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
              {reasons.map((r, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-background shadow-sm border border-border/50 flex items-center justify-center shrink-0">
                    {r.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm mb-1">{r.title}</h4>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed pr-4">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export function FeaturesGrid() {
  const features = [
    { icon: <Wand2 className="w-5 h-5 text-blue-500" />, title: "AI Review Generation", desc: "Help customers write better reviews with AI suggestions." },
    { icon: <MessageSquareText className="w-5 h-5 text-red-500" />, title: "AI Auto Reply", desc: "Reply to reviews instantly with tone-aware, AI-powered replies.", badge: "NEW" },
    { icon: <ListChecks className="w-5 h-5 text-emerald-500" />, title: "Review Management", desc: "Manage, organize & respond to reviews from one smart inbox." },
    { icon: <QrCode className="w-5 h-5 text-amber-500" />, title: "QR Code Campaigns", desc: "Create dynamic QR codes that drive more reviews in seconds." },
    { icon: <Smartphone className="w-5 h-5 text-blue-500" />, title: "NFC Review Collection", desc: "Tap. Review. Done. Collect reviews with NFC technology." },
    { icon: <BarChart3 className="w-5 h-5 text-purple-500" />, title: "Analytics & Insights", desc: "Track performance and make data-driven decisions." },
  ];

  return (
    <section id="features" className="relative overflow-hidden bg-background py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <p className="text-sm font-bold text-blue-600 mb-3 tracking-wide">Powerful Features</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-16">
          Everything You Need to Win on <span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span>
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {features.map((f, i) => (
            <div key={i} className="group relative rounded-3xl border border-border bg-card/85 p-6 text-center shadow-[0_20px_50px_-42px_hsl(var(--foreground)/0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_55px_-38px_hsl(var(--primary)/0.55)]">
              {f.badge && (
                <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {f.badge}
                </span>
              )}
              <div className="w-12 h-12 mx-auto bg-muted/30 dark:bg-muted/10 border border-border/50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm font-medium text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="rounded-full font-bold text-foreground/80 border-border hover:bg-muted/30 dark:bg-muted/10 h-10 px-6"
          onClick={() => document.getElementById("solutions")?.scrollIntoView({ behavior: "smooth" })}
        >
          Explore All Features →
        </Button>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: <Search className="w-5 h-5 text-blue-500" />, title: "Search Business", desc: "Find and select your business on Google." },
    { icon: <Settings className="w-5 h-5 text-emerald-500" />, title: "Create Campaign", desc: "Customize your review campaign in minutes." },
    { icon: <Share2 className="w-5 h-5 text-purple-500" />, title: "Share & Collect", desc: "Share QR/NFC with your customers." },
    { icon: <Star className="w-5 h-5 text-amber-500" />, title: "Get More Reviews", desc: "Customers leave reviews easily on Google." },
    { icon: <Wand2 className="w-5 h-5 text-red-500" />, title: "AI Reply & Manage", desc: "Reply instantly with AI and manage all reviews." },
  ];

  return (
    <section className="py-24 bg-muted/30 dark:bg-muted/10 border-t border-border/50">
      <div className="container mx-auto px-4 lg:px-8 text-center max-w-6xl">
        <p className="text-sm font-bold text-blue-600 mb-3 tracking-wide">How It Works</p>
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-20">
          Simple Steps to More <span className="text-blue-600">5-Star</span> Reviews
        </h2>

        <div className="relative flex flex-col md:flex-row justify-between items-start gap-8 md:gap-4">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-8 left-10 right-10 h-0 border-t-2 border-dashed border-border" />
          
          {steps.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center w-full md:w-48">
              <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center mb-5">
                <div className="w-10 h-10 rounded-full bg-muted/30 dark:bg-muted/10 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>
              <div className="text-xs font-extrabold text-muted-foreground/70 mb-1">{i + 1}</div>
              <h4 className="font-bold text-foreground text-sm mb-2">{step.title}</h4>
              <p className="text-xs font-medium text-muted-foreground px-2 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardShowcase() {
  return (
    <section id="solutions" className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left: Overlapping Mockups */}
          <div className="flex-1 w-full relative h-[500px]">
            {/* Main Background Dashboard */}
            <div className="absolute top-0 left-0 w-[500px] h-[350px] bg-background rounded-xl border border-border shadow-lg p-4 font-sans opacity-90 scale-95 origin-top-left hidden sm:block">
              <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
                <div className="w-20 h-4 bg-muted/80 rounded"></div>
                <div className="flex gap-2">
                  <div className="w-16 h-4 bg-muted rounded"></div>
                  <div className="w-6 h-4 bg-blue-100 dark:bg-blue-500/15 rounded"></div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 space-y-2">
                  <div className="w-full h-8 bg-muted rounded"></div>
                  <div className="w-full h-8 bg-muted rounded"></div>
                  <div className="w-full h-8 bg-muted rounded"></div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 h-16 bg-muted/30 dark:bg-muted/10 rounded border border-border/50"></div>
                    <div className="flex-1 h-16 bg-muted/30 dark:bg-muted/10 rounded border border-border/50"></div>
                    <div className="flex-1 h-16 bg-muted/30 dark:bg-muted/10 rounded border border-border/50"></div>
                  </div>
                  <div className="h-32 bg-muted/30 dark:bg-muted/10 rounded border border-border/50"></div>
                </div>
              </div>
            </div>

            {/* Foreground Mobile / Floating Cards */}
            <div className="absolute top-20 right-0 sm:right-10 w-72 bg-background rounded-2xl border border-border shadow-2xl p-5 z-20 hidden md:block">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">G</div>
                <div>
                  <div className="text-xs font-bold">Your Review</div>
                  <div className="text-[10px] text-amber-500">★★★★★ <span className="text-muted-foreground/70">(4.9)</span></div>
                </div>
              </div>
              <div className="border border-border/50 rounded-xl p-6 text-center mb-4 bg-muted/30 dark:bg-muted/10">
                <div className="w-12 h-12 rounded-full bg-background shadow-sm border border-border mx-auto flex items-center justify-center text-xl font-bold text-foreground mb-2">G</div>
                <div className="text-xs font-bold text-foreground/90">Tap to Review</div>
                <div className="text-[9px] text-muted-foreground">Tap your phone to the NFC device</div>
              </div>
              <div className="h-10 w-10 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5v14M7 5v14M22 8v8M2 8v8"/></svg>
              </div>
            </div>

            {/* AI Reply Modal Float */}
            <div className="absolute bottom-10 left-10 w-80 bg-background rounded-xl border border-border shadow-xl p-4 z-30">
              <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> AI Reply Suggestion
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-3 text-[10px] text-foreground/80 font-medium mb-3">
                Thank you so much for your kind words! We're thrilled to hear you had a great experience with our team...
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-8 rounded-lg border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">Edit</div>
                <div className="flex-1 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">Send Reply</div>
              </div>
            </div>
            
            {/* Recent Reviews Snippet */}
             <div className="absolute bottom-40 -left-4 w-64 bg-background rounded-xl border border-border shadow-xl p-3 z-10">
              <div className="text-[10px] font-bold text-foreground/90 mb-2">Recent Reviews</div>
              <div className="flex gap-2 items-start bg-muted/30 dark:bg-muted/10 p-2 rounded">
                <div className="w-6 h-6 rounded-full bg-muted/80"></div>
                <div>
                  <div className="text-[9px] font-bold text-foreground">Sarah Johnson</div>
                  <div className="text-[8px] text-amber-500">★★★★★</div>
                  <div className="text-[8px] text-muted-foreground mt-1 line-clamp-2">Amazing service and great staff! Highly recommended.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Text & Details */}
          <div className="flex-1 w-full lg:pl-8">
            <p className="text-sm font-bold text-blue-600 mb-3 tracking-wide">All-in-One Dashboard</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-8 leading-tight">
              Manage Everything <br/> From One Beautiful Dashboard
            </h2>
            
            <ul className="space-y-4 mb-10">
              {[
                "Unified review inbox",
                "AI replies with one-click send",
                "Advanced filtering & sorting",
                "Multi-location management",
                "Real-time analytics",
                "Team collaboration"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="font-bold text-foreground/80 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-border/50 pt-8">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button className="w-full h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm">
                  See Dashboard in Action →
                </Button>
              </Link>
              <BookDemoDialog>
              <Button variant="ghost" className="w-full sm:w-auto h-12 px-6 text-foreground/80 font-bold hover:bg-muted/30 dark:bg-muted/10 rounded-xl">
                <Play className="w-4 h-4 mr-2 text-blue-600 fill-blue-600" />
                <div className="text-left leading-tight">
                  <div>Watch Demo</div>
                  <div className="text-[10px] text-muted-foreground/70 font-medium">2 min overview</div>
                </div>
              </Button>
              </BookDemoDialog>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border border-white bg-muted/80"></div>
                <div className="w-6 h-6 rounded-full border border-white bg-slate-300"></div>
                <div className="w-6 h-6 rounded-full border border-white bg-slate-400"></div>
              </div>
              <span className="text-xs font-bold text-muted-foreground/70">Loved by 10,000+ businesses</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="bg-background px-4 pb-24 lg:px-8">
      <div className="container relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-primary/10 bg-[linear-gradient(120deg,hsl(221_68%_39%)_0%,hsl(245_65%_52%)_58%,hsl(285_58%_52%)_100%)] px-8 py-20 text-center shadow-[0_30px_80px_-35px_rgba(49,46,129,0.65)]">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-background opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300 opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
            Ready to Transform Your Google Reputation?
          </h2>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto font-medium">
            Join thousands of businesses already growing with AI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-background hover:bg-muted/30 dark:bg-muted/10 text-blue-600 font-bold text-base rounded-xl shadow-lg">
                Start Free – No Card Required
              </Button>
            </Link>
            <BookDemoDialog>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 border-2 border-white/20 bg-background/10 hover:bg-background/20 text-white font-bold text-base rounded-xl backdrop-blur-sm">
                <Play className="w-4 h-4 mr-2" /> Book a Demo
              </Button>
            </BookDemoDialog>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-blue-100">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-white"/> 14-Day Free Trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-white"/> Cancel Anytime</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-white"/> Setup in 60 Seconds</span>
          </div>
        </div>
      </div>
    </section>
  );
}
