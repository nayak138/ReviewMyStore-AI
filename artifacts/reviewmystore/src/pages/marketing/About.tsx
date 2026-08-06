import { MarketingLayout } from "./layout";
import { usePageMeta } from "./use-page-meta";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Star, Zap, ShieldCheck, HeartHandshake, QrCode, MessageSquareText, BarChart3 } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Friction is the enemy",
    desc: "Every extra tap between a happy customer and a posted review loses people. We obsess over removing steps — from scan to published review in under a minute.",
  },
  {
    icon: ShieldCheck,
    title: "Honest by design",
    desc: "AI drafts, humans decide. Customers always review and edit before posting, and businesses always approve replies. We help real experiences get shared — nothing more.",
  },
  {
    icon: HeartHandshake,
    title: "Built for the counter, not the boardroom",
    desc: "Our users are shop owners, dentists, mechanics, and café managers. If a feature doesn't work in a busy Tuesday lunch rush, it doesn't ship.",
  },
];

const timeline = [
  {
    year: "The problem",
    title: "Great businesses, invisible online",
    desc: "We kept meeting brilliant local businesses with a handful of stale Google reviews — losing customers to louder competitors purely on search visibility.",
  },
  {
    year: "The insight",
    title: "People want to help — asking is what's broken",
    desc: "Happy customers are glad to leave reviews. But asking feels awkward for staff, and writing one from scratch is enough friction that most never do.",
  },
  {
    year: "Today",
    title: "Scan, edit, post",
    desc: "ReviewMyStore turns the moment of delight into a posted Google review: a QR scan or NFC tap, an AI-drafted review the customer makes their own, and one tap to publish.",
  },
];

export default function About() {
  const [, setLocation] = useLocation();
  usePageMeta(
    "About Us — ReviewMyStore.AI",
    "ReviewMyStore.AI helps local businesses turn happy customers into 5-star Google reviews — without the awkward asking. Learn about our mission and values.",
  );

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="pt-32 pb-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/20">
              About Us
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Every great business deserves to be found
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              ReviewMyStore.AI exists for one reason: the businesses people love most are often the
              hardest to find online. We fix that by making it effortless for happy customers to say
              so on Google.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
                Our mission
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Word of mouth went digital, but the tools for earning it didn't keep up. Big brands
                run reputation teams; local businesses get a laminated "Review us!" sign and hope.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We're leveling that field. ReviewMyStore combines QR codes, NFC taps, and AI-drafted
                reviews so that collecting a Google review takes a customer seconds — and takes your
                staff nothing more than "just tap here."
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The result: a steady stream of fresh, authentic reviews, better local search
                rankings, and more customers walking through the door.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: QrCode, label: "Scan or tap to review" },
                { icon: MessageSquareText, label: "AI-drafted, customer-approved" },
                { icon: Star, label: "Posted straight to Google" },
                { icon: BarChart3, label: "Tracked in one dashboard" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-border bg-background flex flex-col items-center text-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story timeline */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Our story</h2>
            <p className="text-muted-foreground">From a recurring frustration to a platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {timeline.map((step, i) => (
              <div key={i} className="p-8 rounded-2xl border border-border bg-card shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  {step.year}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              What we believe
            </h2>
            <p className="text-muted-foreground">The principles behind every feature we ship.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {values.map((v, i) => (
              <div key={i} className="p-8 rounded-2xl border border-border bg-background">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <v.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
            Join us — and let your customers do the talking
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Set up your first review campaign in minutes. Free during early access.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/sign-up")}
            className="h-12 px-8 text-base shadow-sm hover:shadow transition-all"
          >
            Start Free
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
