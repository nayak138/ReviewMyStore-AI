import { Link, useLocation } from "wouter";
import { MarketingLayout } from "./layout";
import { usePageMeta } from "./use-page-meta";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  QrCode,
  Nfc,
  MessageSquareText,
  BarChart3,
  Building2,
  BookOpen,
  LifeBuoy,
  Mail,
  ArrowRight,
} from "lucide-react";

const guides = [
  {
    icon: Rocket,
    category: "Getting started",
    title: "Set up your first review campaign",
    desc: "Connect your Google Business Profile, create a campaign, and share your review link — all in under ten minutes.",
    steps: [
      "Sign up and search for your business by name",
      "Confirm your Google Business Profile listing",
      "Create a campaign and customize the customer prompt",
      "Share via QR code, NFC tag, or short link",
    ],
  },
  {
    icon: QrCode,
    category: "Collection",
    title: "Print & place your QR codes",
    desc: "Where QR codes convert best, how large to print them, and the call-to-action wording that gets scans.",
    steps: [
      "Download your campaign QR code from the dashboard",
      "Print at least 2×2 cm (0.8 in) for arm's-length scanning",
      "Place at the point of delight: counters, receipts, packaging",
      "Pair with a short prompt like \"Loved it? Tell Google in 30 seconds\"",
    ],
  },
  {
    icon: Nfc,
    category: "Collection",
    title: "Use NFC tap-to-review at the counter",
    desc: "Link an NFC tag or stand to a campaign so customers can open your review page with a single tap of their phone.",
    steps: [
      "Order any NTAG-compatible tag or stand",
      "Register the device under NFC Devices in your dashboard",
      "Link it to a campaign — retarget it anytime without reprinting",
      "Train staff on the one-line ask: \"Just tap your phone here\"",
    ],
  },
  {
    icon: MessageSquareText,
    category: "AI",
    title: "Get the most from AI review drafts",
    desc: "How AI-suggested review text works, why customers always edit and approve, and how to tune prompts per campaign.",
    steps: [
      "Customers pick highlights of their visit on the review page",
      "AI drafts a review in natural language from their selections",
      "The customer edits it so it's genuinely theirs",
      "One tap copies it into Google's review box for posting",
    ],
  },
  {
    icon: BarChart3,
    category: "Measurement",
    title: "Track scans, taps, and review growth",
    desc: "Read your campaign dashboard: scan and tap counts, conversion by placement, and monthly review velocity.",
    steps: [
      "Compare scans/taps per campaign to find the best placements",
      "Watch review velocity, not just your average star rating",
      "Rotate underperforming placements to higher-traffic spots",
      "Review weekly during your first month, then monthly",
    ],
  },
  {
    icon: Building2,
    category: "Multi-location",
    title: "Manage multiple locations & clients",
    desc: "Run separate campaigns per location or client, keep reporting clean, and roll out what works across your whole portfolio.",
    steps: [
      "Add each location as its own business with its own listing",
      "Duplicate winning campaigns across locations",
      "Compare locations side by side in the dashboard",
      "On Agency plans, manage every client from one login",
    ],
  },
];

export default function Resources() {
  const [, setLocation] = useLocation();
  usePageMeta(
    "Resources & Guides — ReviewMyStore.AI",
    "Step-by-step guides for collecting Google reviews with ReviewMyStore.AI: setup, QR codes, NFC tap-to-review, AI drafts, and analytics.",
  );

  return (
    <MarketingLayout>
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/20">
              Resources
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Guides & help center
            </h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to go from zero to a steady stream of 5-star Google reviews —
              setup, placement, and best practices.
            </p>
          </div>

          {/* Guides grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {guides.map((guide, i) => (
              <article
                key={i}
                className="p-8 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <guide.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {guide.category}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{guide.title}</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{guide.desc}</p>
                <ol className="space-y-2.5 mt-auto">
                  {guide.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {/* Help strip */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            <Link href="/blog" className="block group cursor-pointer">
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
                <BookOpen className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Read the blog
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Strategy deep-dives on reviews, local SEO, and growth.
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Browse articles <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
            <Link href="/#faq" className="block group cursor-pointer">
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
                <LifeBuoy className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Frequently asked questions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Quick answers about pricing, setup, and how reviews work.
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  See the FAQ <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
            <a href="mailto:contact@reviewmystore.ai" className="block group cursor-pointer">
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
                <Mail className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Contact support
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Stuck on something? We answer every email, usually same-day.
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  Email us <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </a>
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
              The best guide is trying it yourself
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Free during early access — set up your first campaign in minutes.
            </p>
            <Button
              size="lg"
              onClick={() => setLocation("/sign-up")}
              className="h-12 px-8 text-base shadow-sm hover:shadow transition-all"
            >
              Start Free
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
