import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessSearch } from "@/components/business-search";
import { Star, Smartphone, TrendingUp, Zap, MapPin, Phone, Globe, X, ArrowRight } from "lucide-react";
import { useGetPlaceDetails, getGetPlaceDetailsQueryKey, type PlaceAutocompleteSuggestion } from "@workspace/api-client-react";
import { saveSelectedPlace, placePhotoUrl } from "@/lib/selected-place";
import { cn } from "@/lib/utils";

function BusinessLookupSection() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PlaceAutocompleteSuggestion | null>(null);

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
    <section className="relative -mt-4 pb-4">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 text-center">
            Find your business on Google
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 text-center">
            We'll pull your name, category, and photo automatically.
          </p>

          <BusinessSearch
            placeholder="e.g. Daily Grind Coffee, Austin TX"
            onSelect={(s) => setSelected(s)}
          />

          {selected && (
            <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 relative animate-in fade-in slide-in-from-top-2 duration-300">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>

              {isLoading || !details ? (
                <div className="flex gap-4 items-center">
                  <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center border border-border">
                    {details.photoName ? (
                      <img src={placePhotoUrl(details.photoName, 160)} alt={details.name} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{details.name}</h3>
                    {details.category && <p className="text-sm text-muted-foreground truncate">{details.category}</p>}
                    {details.formattedAddress && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" /> {details.formattedAddress}
                      </p>
                    )}
                    {typeof details.rating === "number" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        {details.rating.toFixed(1)}
                        {details.userRatingCount ? ` (${details.userRatingCount})` : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button className="w-full mt-4" size="lg" disabled={!details} onClick={handleContinue}>
                This is my business — Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-4">
            Can't find your business?{" "}
            <Link href="/sign-up" className="text-primary hover:underline font-medium">
              Sign up and enter details manually
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Marketing() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="ReviewMyStore Logo" className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">ReviewMyStore.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 lg:pt-32 pb-8 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white dark:from-blue-900/20 dark:via-zinc-950 dark:to-zinc-950 -z-10" />
          
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-800/50">
              <Star className="w-4 h-4" />
              <span>The #1 AI review generation platform</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight">
              Turn happy customers into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">5-star reviews</span> instantly.
            </h1>
            <p className="text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop begging for reviews. Our AI-assisted platform and NFC standees make it effortless for your customers to leave glowing Google reviews before they even leave your store.
            </p>
          </div>
        </section>

        <BusinessLookupSection />

        {/* Features Section */}
        <section className="py-24 mt-8 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Built for local business growth</h2>
              <p className="text-zinc-600 dark:text-zinc-400">Everything you need to build trust and outrank your competitors on Google Maps.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Tap to Review</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Physical NFC standees let customers just tap their phone to instantly open your Google review page. No searching required.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">AI-Drafted Praise</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Customers hate writing. Our AI suggests personalized, high-quality review text they can post with one tap.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Growth Analytics</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Track your reputation score, conversion rates, and staff performance in a beautiful, real-time dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white dark:bg-zinc-950">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white mb-6">Ready to dominate local search?</h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
              Join thousands of businesses already using ReviewMyStore.ai to grow their revenue.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 bg-zinc-50 dark:bg-zinc-900/30 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          © {new Date().getFullYear()} ReviewMyStore.ai. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
