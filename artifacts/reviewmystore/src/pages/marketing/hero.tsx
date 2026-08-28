import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Check, MapPin, MessageSquareText, QrCode, Star, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BusinessSearch } from "@/components/business-search";
import { BrandIcon } from "@/components/brand-logo";
import { useGetPlaceDetails, getGetPlaceDetailsQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { placePhotoUrl, saveSelectedPlace } from "@/lib/selected-place";

const EXAMPLE_SEARCHES = ["The Taj Mahal Palace, Mumbai", "The Peninsula Hong Kong", "The Plaza Hotel, New York"];

export function HeroSection() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PlaceAutocompleteSuggestion | null>(null);
  const [query, setQuery] = useState("");
  const { data: details, isLoading, isError } = useGetPlaceDetails(selected?.placeId ?? "", {
    query: { enabled: !!selected, queryKey: getGetPlaceDetailsQueryKey(selected?.placeId ?? "") },
  });

  const clearSelection = () => { setSelected(null); setQuery(""); };
  const handleContinue = () => {
    if (!details) return;
    saveSelectedPlace({
      placeId: details.placeId, name: details.name, category: details.category,
      formattedAddress: details.formattedAddress, phone: details.phone, website: details.website,
      latitude: details.latitude, longitude: details.longitude, rating: details.rating,
      userRatingCount: details.userRatingCount, photoName: details.photoName,
    });
    setLocation("/sign-up");
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="google-spectrum absolute inset-x-0 top-0 h-1 opacity-90" />
        <div className="absolute right-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full border border-google-blue/15" />
        <div className="absolute right-[-7rem] top-[-5rem] h-[22rem] w-[22rem] rounded-full border border-google-red/15" />
        <div className="absolute right-[13rem] top-[8rem] h-2 w-2 rounded-full bg-google-yellow shadow-[0_0_0_6px_hsl(var(--google-yellow)/0.12)]" />
      </div>
      <div className="container relative mx-auto px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(29rem,1.08fr)] lg:gap-20">
          <div className="max-w-2xl">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <span className="h-px w-8 bg-primary" /> Reputation, without the busywork
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-7 max-w-xl font-display text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[5.25rem]">
              Good experiences deserve to be <em className="text-primary not-italic">seen.</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mb-9 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              ReviewMyStore.ai gives happy customers a simple path to Google Reviews — and gives you the tools to keep every response thoughtful.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="max-w-lg">
              <div className="rounded-xl border border-border bg-card p-3 shadow-[0_20px_55px_-38px_hsl(var(--foreground)/0.5)] sm:p-4">
                <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> Find your business to begin
                </div>
                <BusinessSearch
                  placeholder="Search your business name..."
                  value={query}
                  onQueryChange={setQuery}
                  openOnValueChange
                  onSelect={(suggestion) => setSelected(suggestion)}
                  inputClassName="h-12 rounded-lg border-border bg-background pl-11 pr-11 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                {selected && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="relative mt-3 overflow-hidden rounded-lg border border-border bg-background p-3">
                    <button type="button" data-testid="button-clear-selected-business" onClick={clearSelection} aria-label="Clear selected business" className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                    {isError ? <p className="py-2 pr-5 text-sm text-muted-foreground">We couldn't load this business. Please try another search.</p> :
                      isLoading || !details ? <div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-md" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div> :
                        <div className="flex items-center gap-3 pr-5">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {details.photoName ? <img src={placePhotoUrl(details.photoName, 120)} alt={details.name} className="h-full w-full object-cover" /> : <MapPin className="m-auto h-5 w-5 translate-y-3 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0"><h3 className="truncate text-sm font-bold">{details.name}</h3><p className="mt-0.5 truncate text-xs text-muted-foreground">{details.formattedAddress}</p>{typeof details.rating === "number" && <p className="mt-1 flex items-center gap-1 text-xs font-semibold"><Star className="h-3 w-3 fill-current text-amber-500" /> {details.rating.toFixed(1)} <span className="font-normal text-muted-foreground">({details.userRatingCount} reviews)</span></p>}</div>
                        </div>}
                    <Button data-testid="button-get-started" disabled={!details} onClick={handleContinue} className="mt-3 h-10 w-full rounded-lg font-semibold">{isLoading ? "Loading business..." : "Continue with this business"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    <button type="button" data-testid="button-business-not-found" onClick={clearSelection} className="mt-2 w-full text-center text-xs font-semibold text-primary hover:underline">Can't find your business?</button>
                  </motion.div>
                )}
                {!selected && <div className="mt-3 flex flex-wrap gap-2 px-1">{EXAMPLE_SEARCHES.map((example) => <button key={example} type="button" data-testid={`button-example-search-${example.slice(0, 5).toLowerCase()}`} onClick={() => setQuery(example)} className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground"><MapPin className="mr-1 inline h-3 w-3" />{example}</button>)}</div>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
                {["14-day free trial", "No credit card", "Cancel anytime"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />{item}</span>)}
              </div>
            </motion.div>
          </div>
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}

function HeroProductPreview() {
  return (
       <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0, y: [0, -5, 0] }} transition={{ delay: 0.3, duration: 0.7, y: { delay: 1.1, duration: 6, repeat: Infinity, ease: "easeInOut" } }} className="relative hidden min-h-[27rem] lg:block">
      <div className="absolute inset-x-0 top-8 rounded-2xl border border-border bg-card p-5 shadow-[0_35px_80px_-48px_hsl(var(--foreground)/0.65)]">
        <div className="mb-7 flex items-center justify-between border-b border-border pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Overview</p><p className="mt-1 text-sm font-semibold">The Daily Standard</p></div><span className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">Last 30 days</span></div>
        <div className="grid grid-cols-3 gap-3">
         {[["Google rating", "4.9", "+0.2", "border-google-blue/30"], ["New reviews", "48", "+18.4%", "border-google-green/30"], ["Response time", "2h", "-34m", "border-google-yellow/40"]].map(([label, value, change, color]) => <div key={label} className={`rounded-lg border bg-background p-3 ${color}`}><p className="text-[10px] font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[10px] font-semibold text-success">{change}</p></div>)}
        </div>
        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="mb-5 flex items-center justify-between"><p className="text-xs font-semibold">Review activity</p><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Reviews</div></div>
           <svg viewBox="0 0 600 155" className="h-36 w-full" role="img" aria-label="Review activity trending upward"><path d="M0 130H600M0 80H600M0 30H600" stroke="hsl(var(--border))" strokeDasharray="3 6" /><path d="M0 124 C65 119 68 102 122 108 S184 98 226 100 S292 72 335 83 S400 69 445 58 S518 67 600 24" fill="none" stroke="hsl(var(--google-blue))" strokeWidth="3" strokeLinecap="round" /><circle cx="445" cy="58" r="5" fill="hsl(var(--card))" stroke="hsl(var(--google-red))" strokeWidth="3" /></svg>
        </div>
      </div>
       <motion.div animate={{ y: [0, -5, 0] }} transition={{ delay: 1.6, duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-1 -left-8 w-64 rounded-xl border border-border bg-background p-4 shadow-[0_25px_55px_-35px_hsl(var(--foreground)/0.65)]">
        <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">New review</span><span className="inline-flex gap-0.5 text-amber-500" aria-label="Five star review">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3 w-3 fill-current" />)}</span></div>
        <p className="text-sm leading-relaxed text-foreground/80">“The team made the whole experience feel easy.”</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">AM</span> Alex M. · today</div>
       </motion.div>
       <motion.div animate={{ y: [0, 5, 0] }} transition={{ delay: 1.9, duration: 5.5, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-6 -right-3 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-[0_22px_55px_-35px_hsl(var(--foreground)/0.65)]"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent"><QrCode className="h-4 w-4 text-accent-foreground" /></div><div><p className="text-xs font-bold">Your review link</p><p className="mt-0.5 text-[10px] text-muted-foreground">Ready to share</p></div></motion.div>
    </motion.div>
  );
}

export function TrustedBySection() {
  const categories = [
    ["CAFÉS", "bg-google-blue"],
    ["CLINICS", "bg-google-red"],
    ["SALONS", "bg-google-yellow"],
    ["HOSPITALITY", "bg-google-green"],
    ["RETAIL", "bg-google-blue"],
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="border-b border-border bg-secondary/35 py-7">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <motion.div initial={{ scale: 0.85, rotate: -8 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 14 }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-background p-1.5 shadow-sm ring-1 ring-google-blue/20">
            <BrandIcon className="h-full w-full rounded-lg" alt="" />
          </motion.div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Made for the places people return to</p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold tracking-tight text-muted-foreground/75">
          {categories.map(([label, color], index) => (
            <motion.span key={label} initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + index * 0.06 }} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />
              {label}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}