import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSearch } from "@/components/business-search";
import { 
  Check, X, ArrowRight, MapPin, Sparkles, 
  Coffee, Hexagon, Scissors, HeartPulse, Home, Utensils
} from "lucide-react";
import { useGetPlaceDetails, getGetPlaceDetailsQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { saveSelectedPlace, placePhotoUrl } from "@/lib/selected-place";
import { Button } from "@/components/ui/button";

const GoogleLogoText = () => (
  <span className="font-bold tracking-tight">
    <span className="text-[#4285F4]">G</span>
    <span className="text-[#EA4335]">o</span>
    <span className="text-[#FBBC05]">o</span>
    <span className="text-[#4285F4]">g</span>
    <span className="text-[#34A853]">l</span>
    <span className="text-[#EA4335]">e</span>
  </span>
);

const EXAMPLE_SEARCHES = [
  "The Taj Mahal Palace, Mumbai",
  "The Peninsula Hong Kong",
  "The Plaza Hotel, New York",
];

export function HeroSection() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PlaceAutocompleteSuggestion | null>(null);
  const [query, setQuery] = useState("");

  const { data: details, isLoading, isError } = useGetPlaceDetails(selected?.placeId ?? "", {
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
    <section className="relative pt-12 pb-16 lg:pt-24 lg:pb-20 overflow-hidden bg-background">
      {/* Background soft blob */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
      
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Left Column: Text & Search */}
          <div className="flex-1 lg:pr-8 w-full z-10 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wide mb-6 border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>The AI-Powered Google Review Platform</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-[4rem] font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]"
            >
              5 ⭐ <GoogleLogoText /> Reviews <br className="hidden lg:block" />
              with AI
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium"
            >
              Get more 5-star reviews, reply instantly with AI, and turn happy customers into your biggest growth engine.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-md mx-auto lg:mx-0 w-full"
            >
              <p className="text-sm font-semibold text-foreground/80 mb-3 text-left">Try searching for your business:</p>
              
              <div className="relative">
                <BusinessSearch
                  placeholder="Start typing your business name..."
                  value={query}
                  onQueryChange={setQuery}
                  openOnValueChange
                  onSelect={(s) => setSelected(s)}
                  inputClassName="h-14 text-base shadow-sm border-border bg-background"
                />
                
                {selected && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    className="rounded-xl border border-border bg-background shadow-lg p-4 relative overflow-hidden text-left"
                  >
                    <button
                      type="button"
                      onClick={() => { setSelected(null); setQuery(""); }}
                      className="absolute top-3 right-3 text-muted-foreground/70 hover:text-muted-foreground transition-colors z-10 bg-background/80 backdrop-blur rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {isError ? (
                      <div className="text-sm text-muted-foreground py-2">
                        Couldn't load this business right now. Please try another search.
                      </div>
                    ) : isLoading || !details ? (
                      <div className="flex gap-4 items-center">
                        <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1 w-full">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border">
                          {details.photoName ? (
                            <img src={placePhotoUrl(details.photoName, 120)} alt={details.name} className="w-full h-full object-cover" />
                          ) : (
                            <MapPin className="w-6 h-6 text-muted-foreground/70" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-foreground truncate">{details.name}</h3>
                          {details.formattedAddress && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{details.formattedAddress}</p>
                          )}
                          {typeof details.rating === "number" && (
                            <p className="text-xs font-bold text-foreground/80 flex items-center gap-1 mt-1.5">
                              <span className="text-amber-500">★</span> {details.rating.toFixed(1)}
                              <span className="text-muted-foreground font-normal">({details.userRatingCount} reviews)</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4 h-10 text-sm font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white" 
                      disabled={!details} 
                      onClick={handleContinue}
                    >
                      {isLoading ? "Loading business..." : "Claim this business"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>

              {!selected && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {EXAMPLE_SEARCHES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setQuery(example)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/30 dark:bg-muted/10 hover:bg-muted text-[11px] font-semibold text-muted-foreground transition-colors"
                    >
                      <MapPin className="w-3 h-3 text-muted-foreground/70" />
                      {example}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground mt-8">
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-600"/> 14-Day Free Trial</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-600"/> No Credit Card</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-600"/> Cancel Anytime</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-blue-600"/> GDPR Compliant</span>
              </div>
            </motion.div>
          </div>
          
          {/* Right Column: Visual Mockup */}
          <div className="flex-1 w-full relative z-10 hidden md:block">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="relative w-full max-w-[700px] ml-auto"
            >
              <HeroDashboardMockup />
              
              {/* Floating Card: AI Reply Assistant */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-8 -right-4 bg-background rounded-2xl shadow-xl border border-border p-4 flex items-start gap-4 w-72 z-20 animate-[bounce_4s_infinite]"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">AI Reply Assistant</h4>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">Reply to reviews instantly with AI power</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroDashboardMockup() {
  return (
    <div className="bg-background rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-border overflow-hidden w-full text-left font-sans">
      {/* Top Bar */}
      <div className="h-12 border-b border-border/50 bg-background flex items-center px-4 justify-between">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-muted/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted/80" />
        </div>
        <div className="font-bold text-foreground/90 text-sm flex-1 text-center pl-8">Overview</div>
        <div className="flex gap-2 items-center">
          <div className="h-6 w-24 bg-muted/30 dark:bg-muted/10 border border-border/50 rounded text-[10px] font-semibold text-muted-foreground flex items-center justify-center px-2">All Locations ▾</div>
          <div className="h-6 w-20 bg-muted/30 dark:bg-muted/10 border border-border/50 rounded text-[10px] font-semibold text-muted-foreground flex items-center justify-center px-2">Last 30 Days ▾</div>
          <div className="w-6 h-6 rounded-full bg-muted/80 border border-slate-300 dark:border-slate-600 ml-2" />
        </div>
      </div>
      
      <div className="flex h-[420px]">
        {/* Sidebar */}
        <div className="w-14 border-r border-border/50 bg-muted/30 dark:bg-muted/10/50 flex flex-col items-center py-4 gap-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Home className="w-4 h-4" /></div>
          <div className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground/70 flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
          <div className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground/70 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
          <div className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground/70 flex items-center justify-center"><Utensils className="w-4 h-4" /></div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-5 bg-background flex flex-col gap-5 overflow-hidden">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-border/50 rounded-xl p-3 bg-background">
              <div className="text-[10px] font-semibold text-muted-foreground/70 mb-1">Total Reviews</div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-blue-500 font-bold text-sm">G</span>
                <span className="text-lg font-extrabold text-foreground">4,782</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-500">↑ 15.8%</div>
            </div>
            <div className="border border-border/50 rounded-xl p-3 bg-background">
              <div className="text-[10px] font-semibold text-muted-foreground/70 mb-1">Average Rating</div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-amber-400 text-sm">★</span>
                <span className="text-lg font-extrabold text-foreground">4.9</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-500">↑ 0.1</div>
            </div>
            <div className="border border-border/50 rounded-xl p-3 bg-background">
              <div className="text-[10px] font-semibold text-muted-foreground/70 mb-1">Reviews This Month</div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-blue-500 font-bold text-sm">📊</span>
                <span className="text-lg font-extrabold text-foreground">1,246</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-500">↑ 32.4%</div>
            </div>
            <div className="border border-border/50 rounded-xl p-3 bg-background">
              <div className="text-[10px] font-semibold text-muted-foreground/70 mb-1">AI Replies Sent</div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-emerald-500 font-bold text-sm">✨</span>
                <span className="text-lg font-extrabold text-foreground">352</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-500">↑ 24.2%</div>
            </div>
          </div>
          
          {/* Charts Row */}
          <div className="flex gap-5 flex-1 min-h-0">
            {/* Main Chart */}
            <div className="flex-1 border border-border/50 rounded-xl p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-foreground/90">Review Growth</span>
                <div className="flex gap-2 text-[9px] font-semibold text-muted-foreground/70">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Reviews</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Ratings</span>
                </div>
              </div>
              <div className="flex-1 relative">
                <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <path d="M 0 30 H 400 M 0 75 H 400 M 0 120 H 400" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                  <path d="M 0 100 C 50 100, 80 80, 120 90 C 180 110, 220 50, 280 60 C 340 70, 380 40, 400 30" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 0 120 C 60 110, 100 130, 150 100 C 200 70, 250 80, 300 50 C 350 20, 380 40, 400 45" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  
                  {/* Tooltip Dot */}
                  <circle cx="280" cy="60" r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                </svg>
                {/* Tooltip Box */}
                <div className="absolute top-4 left-1/2 ml-10 bg-background border border-border shadow-md rounded p-1.5 pointer-events-none">
                  <div className="text-[8px] font-bold text-foreground/90">May 12, 2024</div>
                  <div className="text-[8px] text-muted-foreground">Reviews: <span className="font-bold">48</span></div>
                </div>
                {/* X axis labels */}
                <div className="absolute bottom-[-16px] w-full flex justify-between text-[8px] font-semibold text-muted-foreground/70 px-2">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                </div>
              </div>
            </div>
            
            {/* Side column widgets */}
            <div className="w-40 flex flex-col gap-4">
              <div className="flex-1 border border-border/50 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-foreground/90 mb-2">Top Source</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-border/50 border-t-blue-500 border-r-blue-500 relative"></div>
                  <div>
                    <div className="text-[9px] font-semibold text-muted-foreground/70">QR Codes</div>
                    <div className="text-sm font-extrabold text-foreground">1,856</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 border border-border/50 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] font-bold text-foreground/90 mb-2">AI Reply Rate</span>
                <div className="text-2xl font-extrabold text-foreground mb-1">98%</div>
                <div className="text-[9px] font-bold text-emerald-500">↑ 14.2%</div>
                <svg className="absolute bottom-0 right-0 w-24 h-12 text-emerald-100" viewBox="0 0 100 50">
                  <path d="M0 50 Q 25 30 50 40 T 100 10 L 100 50 Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustedBySection() {
  const logos = [
    { name: "CAFE ESCURO", icon: <Coffee className="w-5 h-5" /> },
    { name: "TechFlex", icon: <Hexagon className="w-5 h-5" /> },
    { name: "SALON 247", icon: <Scissors className="w-5 h-5" /> },
    { name: "HealthCare", icon: <HeartPulse className="w-5 h-5" /> },
    { name: "HomeDecor", icon: <Home className="w-5 h-5" /> },
    { name: "UrbanBite", icon: <Utensils className="w-5 h-5" /> },
  ];

  return (
    <section className="py-10 bg-background border-b border-border/50">
      <div className="container mx-auto px-4 lg:px-8">
        <p className="text-center text-xs font-bold text-muted-foreground/70 mb-6 tracking-wide">
          Trusted by 10,000+ businesses worldwide
        </p>

        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 text-muted-foreground/70">
          {logos.map((logo, i) => (
            <div key={i} className="flex items-center gap-2 font-bold text-sm tracking-tight grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:text-foreground/80 transition-all">
              {logo.icon}
              <span>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}