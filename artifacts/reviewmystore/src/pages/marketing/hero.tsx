import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSearch } from "@/components/business-search";
import { Star, Smartphone, QrCode, MessageSquareText, BarChart3, Target, MapPin, X, ArrowRight, Zap } from "lucide-react";
import { useGetPlaceDetails, getGetPlaceDetailsQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { saveSelectedPlace, placePhotoUrl } from "@/lib/selected-place";
import { BookDemoDialog } from "@/components/book-demo-dialog";

export function HeroSection() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative isolate pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none -z-20 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black_35%,transparent_85%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 0.09) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.09) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-[0.14] dark:opacity-[0.16] pointer-events-none -z-10"
           style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary)) 0%, transparent 70%)" }} />
      <div className="absolute top-40 left-0 w-[500px] h-[500px] opacity-[0.08] dark:opacity-[0.1] pointer-events-none -z-10 blur-3xl rounded-full bg-blue-400 dark:bg-blue-600" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] opacity-[0.05] dark:opacity-[0.08] pointer-events-none -z-10 blur-3xl rounded-full bg-emerald-400 dark:bg-emerald-600" />

      <div className="container mx-auto px-4 lg:px-8 text-center max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 backdrop-blur-sm"
        >
          <Zap className="w-4 h-4" />
          <span>The AI-Powered Google Review Platform</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]"
        >
          Collect More Google <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400">Reviews with AI</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
        >
          ReviewMyStore.AI helps businesses collect and grow Google Reviews using AI-powered review generation, QR Codes, and NFC devices.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button onClick={() => setLocation('/sign-up')} size="lg" className="h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
            Start Free
          </Button>
          <BookDemoDialog>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold w-full sm:w-auto bg-background hover:bg-accent border-border hover:border-border">
              Book a Demo
            </Button>
          </BookDemoDialog>
        </motion.div>

        <InteractiveSearchSection />

        {/* Hero Visual Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 relative mx-auto w-full max-w-4xl perspective-[2000px]"
        >
          {/* Floating cards */}
          <div className="absolute top-10 -left-12 lg:-left-24 bg-card border border-border shadow-xl rounded-2xl p-4 flex items-center gap-3 animate-bounce shadow-primary/5 z-20" style={{ animationDuration: '4s' }}>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-foreground">QR Ready</p>
              <p className="text-xs text-muted-foreground">Scan to review</p>
            </div>
          </div>

          <div className="absolute top-40 -right-8 lg:-right-20 bg-card border border-border shadow-xl rounded-2xl p-4 flex items-center gap-3 animate-bounce shadow-emerald-500/5 z-20" style={{ animationDuration: '5s', animationDelay: '1s' }}>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-foreground">New 5-Star</p>
              <p className="text-xs text-muted-foreground">Just now</p>
            </div>
          </div>

          <div className="absolute -bottom-6 left-10 lg:left-20 bg-card border border-border shadow-xl rounded-2xl p-4 flex items-center gap-3 animate-bounce shadow-indigo-500/5 z-20" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-foreground">AI Review Draft</p>
              <p className="text-xs text-muted-foreground">Ready to post</p>
            </div>
          </div>

          {/* Browser Mockup */}
          <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-2xl transform rotate-x-[5deg] rotate-y-[0deg] rotate-z-[0deg] transition-transform duration-700 hover:rotate-x-[0deg]">
            <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="mx-auto bg-background border border-border h-6 rounded-md w-1/2 flex items-center px-3">
                <span className="text-[10px] text-muted-foreground">app.reviewmystore.ai</span>
              </div>
            </div>
            {/* Dashboard Mockup Content */}
            <div className="p-6 bg-card flex gap-6 h-[400px]">
              {/* Sidebar */}
              <div className="w-48 hidden md:flex flex-col gap-2 border-r border-border pr-4">
                <div className="h-8 rounded bg-primary/10 mb-4 w-full flex items-center px-3 gap-2 text-primary text-sm font-medium">
                  <BarChart3 className="w-4 h-4" /> Overview
                </div>
                <div className="h-8 rounded hover:bg-muted w-full flex items-center px-3 gap-2 text-muted-foreground text-sm">
                  <MessageSquareText className="w-4 h-4" /> Inbox
                </div>
                <div className="h-8 rounded hover:bg-muted w-full flex items-center px-3 gap-2 text-muted-foreground text-sm">
                  <QrCode className="w-4 h-4" /> Campaigns
                </div>
              </div>
              {/* Main Content */}
              <div className="flex-1 flex flex-col gap-6 text-left">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-foreground">Dashboard</h3>
                  <div className="flex gap-2 items-center">
                    <div className="h-8 w-24 bg-muted rounded"></div>
                    <div className="h-8 w-8 bg-primary/80 rounded-full"></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 bg-background border border-border rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                    <div className="text-muted-foreground text-xs mb-1">Total Reviews</div>
                    <div className="text-2xl font-bold text-foreground">1,248</div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                      <Star className="w-16 h-16" />
                    </div>
                  </div>
                  <div className="h-24 bg-background border border-border rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                    <div className="text-muted-foreground text-xs mb-1">Average Rating</div>
                    <div className="text-2xl font-bold text-emerald-500">4.9</div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-emerald-500">
                      <Target className="w-16 h-16" />
                    </div>
                  </div>
                  <div className="h-24 bg-background border border-border rounded-lg p-4 flex flex-col justify-center relative overflow-hidden">
                    <div className="text-muted-foreground text-xs mb-1">QR Scans</div>
                    <div className="text-2xl font-bold text-blue-500">342</div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-blue-500">
                      <Zap className="w-16 h-16" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-4">
                  <div className="h-4 w-32 bg-muted rounded mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted/30 border border-border/50 rounded flex items-center px-4 gap-4">
                        <div className="w-8 h-8 rounded-full bg-muted/80"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-1/4 bg-muted rounded"></div>
                          <div className="h-2 w-1/2 bg-muted/50 rounded"></div>
                        </div>
                        <div className="flex text-amber-400 gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-current" />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const EXAMPLE_SEARCHES = [
  "The Taj Mahal Palace, Mumbai",
  "The Peninsula Hong Kong",
  "The Plaza Hotel, New York",
];

export function InteractiveSearchSection() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PlaceAutocompleteSuggestion | null>(null);
  const [query, setQuery] = useState("");

  const { data: details, isLoading } = useGetPlaceDetails(selected?.placeId ?? "", {
    query: { enabled: !!selected, queryKey: getGetPlaceDetailsQueryKey(selected?.placeId ?? "") },
  });

  const handleContinue = () => {
    if (!details) return;
    saveSelectedPlace({
      placeId: details.placeId,
      name: details.name,
      category: details.category,
      formattedAddress: details.formattedAddress,
      phone: details.phone,
      website: details.website,
      latitude: details.latitude,
      longitude: details.longitude,
      rating: details.rating,
      userRatingCount: details.userRatingCount,
      photoName: details.photoName,
    });
    setLocation("/sign-up");
  };

  return (
    <section className="relative z-10 pt-12 pb-0">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 lg:p-10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Find your business on Google
            </h2>
            <p className="text-muted-foreground">
              We'll pull your name, category, and photo automatically to set up your workspace.
            </p>
          </div>

          <p className="text-sm font-medium text-muted-foreground text-center mb-3">Try searching for your business:</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {EXAMPLE_SEARCHES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary text-sm font-medium text-foreground transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                {example}
              </button>
            ))}
          </div>

          <BusinessSearch
            placeholder="Search for your business on Google..."
            value={query}
            onQueryChange={setQuery}
            onSelect={(s) => setSelected(s)}
            inputClassName="h-16 text-lg shadow-inner bg-background border-border"
          />

          {selected && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              className="rounded-xl border border-border bg-secondary/40 p-4 relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10 bg-background/80 backdrop-blur rounded-full p-1"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>

              {isLoading || !details ? (
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left p-2">
                  <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                  <div className="space-y-3 flex-1 w-full pt-1">
                    <Skeleton className="h-5 w-3/4 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-1/2 mx-auto sm:mx-0" />
                    <Skeleton className="h-4 w-1/3 mx-auto sm:mx-0" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start p-2">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0 flex items-center justify-center border border-border shadow-sm">
                    {details.photoName ? (
                      <img src={placePhotoUrl(details.photoName, 160)} alt={details.name} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-foreground truncate">{details.name}</h3>
                    {details.category && <p className="text-sm font-medium text-primary mt-1">{details.category}</p>}
                    {details.formattedAddress && (
                      <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {details.formattedAddress}
                      </p>
                    )}
                    {typeof details.rating === "number" && (
                      <p className="text-sm font-medium text-foreground flex items-center justify-center sm:justify-start gap-1.5 mt-2 bg-background inline-flex px-2 py-0.5 rounded-md border border-border">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        {details.rating.toFixed(1)}
                        <span className="text-muted-foreground font-normal ml-1">
                          {details.userRatingCount ? `(${details.userRatingCount} reviews)` : ""}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button 
                className="w-full mt-6 h-12 text-base font-semibold shadow-sm" 
                disabled={!details} 
                onClick={handleContinue}
              >
                {isLoading ? "Loading business..." : "This is my business — Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          <p className="text-sm text-center text-muted-foreground mt-6">
            Can't find your business?{" "}
            <button onClick={() => setLocation('/sign-up')} className="text-primary hover:underline font-medium bg-transparent border-none cursor-pointer">
              Enter details manually
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}

export function TrustedBySection() {
  const stats = [
    { value: "1 tap", label: "From phone to Google review" },
    { value: "<30 sec", label: "For customers to post a review" },
    { value: "3 formats", label: "PNG, SVG & print-ready PDF" },
    { value: "No app", label: "Required for your customers" },
  ];

  return (
    <section className="py-12 bg-background border-y border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground mb-10 uppercase tracking-widest">
          Built for local businesses of every kind
        </p>

        {/* Industry strip */}
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 mb-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="text-2xl font-serif font-bold text-foreground">Restaurants</span>
          <span className="text-xl font-sans font-black tracking-tighter text-foreground uppercase">Salons</span>
          <span className="text-2xl font-mono font-bold text-foreground">Hotels</span>
          <span className="text-xl font-sans font-bold text-foreground italic">Clinics</span>
          <span className="text-2xl font-sans font-extrabold text-foreground tracking-tight">Retail</span>
          <span className="text-xl font-serif font-semibold text-foreground">Auto Shops</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
