import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Globe,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { ReviewTone, SupportedLanguage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/brand-logo";
import { LanguageSelector } from "@/components/customer-review/LanguageSelector";
import { downloadVCard } from "@/lib/vcard";
import { cn } from "@/lib/utils";
import { isRtlLanguage } from "@/lib/languages";
import { getReviewPageStrings } from "@/lib/reviewPageTranslations";

const DEMO_GOOGLE_URL =
  "https://www.google.com/maps/search/?api=1&query=Taj%20Mahal%20Palace%20Mumbai";

const highlights = [
  "Beautiful views",
  "Warm hospitality",
  "Elegant rooms",
  "Great location",
];

const tones = [
  { value: ReviewTone.ENTHUSIASTIC, key: "toneEnthusiastic" as const },
  { value: ReviewTone.SHORT_DIRECT, key: "toneShort" as const },
  { value: ReviewTone.DETAILED, key: "toneDetailed" as const },
  { value: ReviewTone.WARM, key: "toneWarm" as const },
];

type DemoLanguage = SupportedLanguage | string;
const demoHeaderImage = `${import.meta.env.BASE_URL}taj-mahal-palace-mumbai.jpg`;

export function InteractiveReviewDemo() {
  const [rating, setRating] = useState<number | null>(null);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([
    "Warm hospitality",
    "Great location",
  ]);
  const [tone, setTone] = useState<ReviewTone>(ReviewTone.WARM);
  const [language, setLanguage] = useState<DemoLanguage>(SupportedLanguage.en);
  const [detail, setDetail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [headerImageFailed, setHeaderImageFailed] = useState(false);
  const strings = getReviewPageStrings(language);
  const rtl = isRtlLanguage(language);

  const toggleHighlight = (highlight: string) => {
    setSelectedHighlights((current) =>
      current.includes(highlight)
        ? current.filter((item) => item !== highlight)
        : [...current, highlight],
    );
  };

  const generateReview = async () => {
    if (!rating || isGenerating) return;

    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/v1/public/demo-review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `landing-demo-${crypto.randomUUID()}`,
          keywords: selectedHighlights.length > 0 ? selectedHighlights : ["a memorable stay"],
          rating,
          tone,
          language,
          mentionDetail: detail.trim() || null,
          customerName: customerName.trim() || null,
          occasion: occasion.trim() || null,
        }),
      });

      const result = (await response.json()) as { reviewText?: string; message?: string };
      if (!response.ok || !result.reviewText) {
        throw new Error(result.message || "The review could not be generated.");
      }
      setReviewText(result.reviewText);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "The review could not be generated.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReview = async () => {
    if (!reviewText) return;
    try {
      await navigator.clipboard.writeText(reviewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const copyAndOpenGoogle = async () => {
    await copyReview();
    window.open(DEMO_GOOGLE_URL, "_blank", "noopener,noreferrer");
  };

  const shareDemo = async () => {
    const shareData = {
      title: "Taj Mahal Palace Mumbai",
      text: "Try this interactive review experience powered by 5-Star.AI.",
      url: window.location.href,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  };

  return (
    <section id="review-demo" className="relative overflow-hidden border-b border-border bg-[#edf3ff] py-16 dark:bg-[#05091d] sm:py-24 lg:min-h-[calc(100dvh-4.75rem)] lg:py-20">
      <div className="editorial-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-48 top-24 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="mx-auto max-w-[80rem] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Your next five-star review starts here</p>
          <h2 className="font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-5xl">
            Turn a great stay into a story worth sharing.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Give every happy guest a simpler path from “I loved it” to a thoughtful Google review.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-[1.75rem] bg-[#f8faff] shadow-[0_28px_100px_-38px_rgba(28,57,125,0.35)] dark:bg-[#0a1430] dark:shadow-[0_28px_100px_-38px_rgba(0,0,0,0.8)]">
          <header className="relative min-h-[285px] overflow-hidden bg-[linear-gradient(130deg,#0c1a39_0%,#173c69_44%,#0b142b_100%)] sm:min-h-[350px]">
            {!headerImageFailed && (
              <img
                src={demoHeaderImage}
                alt="Exterior of The Taj Mahal Palace Mumbai"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setHeaderImageFailed(true)}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050713]/90 via-[#050713]/25 to-[#050713]/10" />
            <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#081126]/90 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md">
                <span
                  className="font-sans text-[20px] font-black leading-none"
                  style={{
                    backgroundImage: "conic-gradient(from -45deg, #4285f4 0 25%, #34a853 25% 45%, #fbbc05 45% 65%, #ea4335 65% 85%, #4285f4 85% 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                  aria-hidden="true"
                >
                  G
                </span>
                Google Verified
              </div>
            </div>
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <LanguageSelector value={language} onChange={setLanguage} />
            </div>
            <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">
              <h3 className="font-display text-3xl font-semibold leading-tight">
                Taj Mahal Palace{" "}
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  Mumbai
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center align-middle sm:h-9 sm:w-9" title="Verified business" aria-label="Verified business">
                    <BadgeCheck className="h-8 w-8 fill-[#22c875] text-[#075b37] drop-shadow-[0_2px_5px_rgba(34,200,117,0.35)] sm:h-9 sm:w-9" aria-hidden="true" />
                  </span>
                </span>
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/85">
                <span>Luxury hotel</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />Apollo Bandar, Mumbai</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                <Star className="h-4 w-4 fill-[#fbbc04] text-[#fbbc04]" aria-hidden="true" />
                4.7 <span className="font-normal text-white/80">(28,420)</span>
              </div>
            </div>
          </header>

          <div className="border-b border-[#d8e2fb] bg-[#eef3ff] px-4 py-4 dark:border-white/10 dark:bg-[#0a1430] sm:px-7">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button asChild size="sm" className="h-11 w-full rounded-full bg-[#1769ff] px-3 text-xs font-semibold shadow-[0_8px_18px_rgba(23,105,255,0.28)] hover:bg-[#0e59df] sm:w-auto sm:px-5 sm:text-sm">
                <a href="tel:+912266665666"><Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Call</a>
              </Button>
              <Button variant="outline" size="sm" className="h-11 w-full rounded-full border-[#cbd8f5] bg-[#e4ecff] px-3 text-xs font-semibold text-[#20345f] hover:bg-[#d8e4ff] dark:border-white/15 dark:bg-[#172548] dark:text-slate-100 sm:w-auto sm:px-4 sm:text-sm" onClick={() => downloadVCard({ name: "Taj Mahal Palace Mumbai", phone: "+91 22 6665 6666", address: "Apollo Bandar, Mumbai, Maharashtra", website: "https://tajhotels.com" })}>
                <IdCard className="mr-1.5 h-4 w-4 text-[#5b83ff]" aria-hidden="true" />Save Contact
              </Button>
            </div>
            <div className="mt-3 flex w-full items-center justify-center gap-2">
              <Button asChild variant="outline" size="sm" aria-label="Directions" title="Directions" className="h-11 w-11 rounded-xl border-[#a8e5d1] bg-[#ddf8ef] p-0 text-[#087f6a] hover:bg-[#c9f1e4]">
                <a href="https://www.google.com/maps/dir/?api=1&destination=Taj%20Mahal%20Palace%20Mumbai" target="_blank" rel="noopener noreferrer"><MapPin className="h-5 w-5 text-[#19b892]" aria-hidden="true" /></a>
              </Button>
              <Button variant="outline" size="sm" aria-label={shared ? "Link copied" : "Share"} title={shared ? "Link copied" : "Share"} className="h-11 w-11 rounded-xl border-[#d7b8f5] bg-[#f0e5ff] p-0 text-[#7541a8] hover:bg-[#e7d8fa]" onClick={() => void shareDemo()}>
                {shared ? <Check className="h-5 w-5 text-[#19d7a5]" aria-hidden="true" /> : <Share2 className="h-5 w-5 text-[#9f7aea]" aria-hidden="true" />}
              </Button>
              <a href="https://www.tajhotels.com/" target="_blank" rel="noopener noreferrer" aria-label="Website" title="Website" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9cbf5] bg-[#e3ebff] text-[#526da6] hover:bg-[#d6e2ff]"><Globe className="h-5 w-5" aria-hidden="true" /></a>
              <a href={DEMO_GOOGLE_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Maps" title="Google Maps" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#b9cbf5] bg-white text-[#4285f4] hover:bg-[#f5f7ff]"><span className="text-lg font-bold">G</span></a>
              <a href="https://www.instagram.com/tajhotels/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6def2] bg-white text-[#d94688] hover:bg-[#f5f7ff]"><span className="text-sm font-bold">◎</span></a>
            </div>
          </div>

          <section className="mx-auto w-full max-w-[760px] space-y-4 px-4 pb-8 pt-5 sm:px-7" dir={rtl ? "rtl" : "ltr"}>
            {!reviewText ? (
              <div className="rounded-[1.5rem] border border-[#d8e2fb] bg-white p-5 dark:border-white/10 dark:bg-[#102044] sm:p-7">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2860c8] dark:text-[#82b3ff]">Step 1</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-display text-2xl font-semibold tracking-tight text-foreground">{strings.ratingQuestion}</h4>
                    <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)} className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <Star className={cn("h-8 w-8 transition-colors", rating && value <= rating ? "fill-[#fbbc04] text-[#fbbc04]" : "text-[#9bb0d4]")} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hidden rounded-2xl bg-[#e8efff] p-3 text-[#3f63c5] sm:block dark:bg-[#1a315c] dark:text-[#9ab8ff]"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
                </div>

                {rating !== null && (
                  <div className="mt-6 space-y-6 border-t border-border pt-6">
                    <div>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 2</p>
                      <h4 className="mb-3 font-display text-2xl font-semibold tracking-tight text-foreground">{strings.highlightsTitle}</h4>
                      <div className="flex flex-wrap gap-2">
                        {highlights.map((highlight) => (
                          <button key={highlight} type="button" aria-pressed={selectedHighlights.includes(highlight)} onClick={() => toggleHighlight(highlight)} className={cn("rounded-full border px-3.5 py-2 text-sm font-medium transition-all", selectedHighlights.includes(highlight) ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background/70 text-foreground hover:border-primary/50 hover:bg-accent")}>{highlight}</button>
                        ))}
                      </div>
                      <input value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={60} placeholder={strings.mentionPlaceholder} className="mt-4 w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                    <div>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 3</p>
                      <h4 className="mb-3 font-display text-2xl font-semibold tracking-tight text-foreground">{strings.toneTitle}</h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        {tones.map((option) => <button key={option.value} type="button" aria-pressed={tone === option.value} onClick={() => setTone(option.value)} className={cn("rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all", tone === option.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background/70 text-foreground hover:border-primary/50 hover:bg-accent")}>{strings[option.key]}</button>)}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={60} placeholder={strings.namePlaceholder} className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      <input value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={60} placeholder={strings.occasionPlaceholder} className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>
                )}

                {error && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
                <Button className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-[#2d7dff] to-[#6264e8] text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(56,103,235,0.75)] hover:from-[#1f6ff0] hover:to-[#5556d8] disabled:!opacity-100 disabled:from-[#2f61b0] disabled:to-[#5555a1]" size="lg" disabled={!rating || isGenerating} onClick={() => void generateReview()}>
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{strings.generatingButton}</> : <><Sparkles className="mr-2 h-4 w-4" />{strings.generateButton}</>}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">You’ll get to read and edit it before anything is posted.</p>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-[#d8e2fb] bg-white p-5 dark:border-white/10 dark:bg-[#102044] sm:p-7">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ready when you are</p>
                <h4 className="font-display text-2xl font-semibold tracking-tight text-foreground">Your review is ready.</h4>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={6} aria-label="Generated Google review" className="mt-5 w-full resize-y rounded-xl border border-input bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <div className="mt-6">
                  <Button className="h-12 w-full rounded-xl bg-[#1769ff] text-sm font-semibold shadow-[0_8px_20px_rgba(23,105,255,0.22)] hover:bg-[#0e59df]" onClick={() => void copyAndOpenGoogle()}>
                    {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {copied ? strings.copiedLabel : strings.copyAndOpenButton}
                  </Button>
                </div>
                <Button variant="ghost" className="mt-3 h-10 w-full text-sm text-muted-foreground" onClick={() => setReviewText("")}>{strings.regenerateButton}</Button>
              </div>
            )}
          </section>
          <div className="flex items-center justify-center gap-2 border-t border-[#d8e2fb] bg-[#eef3ff] py-5 text-xs text-muted-foreground dark:border-white/10 dark:bg-[#0a1430]">
            <BrandIcon className="h-5 w-5" alt="" /> Powered by 5-Star.AI
          </div>
        </div>
      </div>
    </section>
  );
}