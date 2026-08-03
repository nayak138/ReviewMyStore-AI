import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Star, Smartphone, TrendingUp, Zap } from "lucide-react";

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
        <section className="py-24 lg:py-32 relative overflow-hidden">
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
            <p className="text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop begging for reviews. Our AI-assisted platform and NFC standees make it effortless for your customers to leave glowing Google reviews before they even leave your store.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                  Start Your Free Trial
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                  See How It Works
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
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
