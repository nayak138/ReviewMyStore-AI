import { useRef, useState, type KeyboardEvent } from "react";
import {
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
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./brand-logo";
import { LanguageSelector } from "./LanguageSelector";
import { cn } from "@/lib/utils";
import { isRtlLanguage } from "./languages";
import { getReviewPageStrings } from "./reviewPageTranslations";

type ApiReviewTone = "ENTHUSIASTIC" | "SHORT_DIRECT" | "DETAILED" | "WARM";
type SupportedLanguage = string;
const socialAssetBase = "/__mockup/images/landing-graphics/social";
const GOOGLE_MAPS_ICON = `${socialAssetBase}/google-maps.png`;
const INSTAGRAM_ICON = `${socialAssetBase}/instagram.png`;

const highlights = [
  "Beautiful views",
  "Warm hospitality",
  "Elegant rooms",
  "Great location",
];

const DEMO_REVIEW_TONE = {
  ENTHUSIASTIC: "ENTHUSIASTIC",
  SHORT_DIRECT: "SHORT_DIRECT",
  DETAILED: "DETAILED",
  WARM: "WARM",
} as const satisfies Record<string, ApiReviewTone>;
const tones = [
  { value: DEMO_REVIEW_TONE.ENTHUSIASTIC, key: "toneEnthusiastic" as const },
  { value: DEMO_REVIEW_TONE.SHORT_DIRECT, key: "toneShort" as const },
  { value: DEMO_REVIEW_TONE.DETAILED, key: "toneDetailed" as const },
  { value: DEMO_REVIEW_TONE.WARM, key: "toneWarm" as const },
];

type DemoLanguage = SupportedLanguage | string;
const demoHeaderImage = "/__mockup/images/landing-graphics/marina-bay-sands-singapore.jpg";

export function InteractiveReviewDemo({ active = true, onStatusChange }: { active?: boolean; onStatusChange?: (message: string) => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [tone, setTone] = useState<ApiReviewTone | null>(null);
  const [language, setLanguage] = useState<DemoLanguage>("en");
  const [detail, setDetail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [shared, setShared] = useState(false);
  const [headerImageFailed, setHeaderImageFailed] = useState(false);
  const demoFooterRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const pendingRef = useRef(false);
  const ratingRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
    if (!rating || pendingRef.current) return;

    const activeElement = document.activeElement;
    if (activeRef.current && activeElement instanceof HTMLElement) activeElement.blur();
    pendingRef.current = true;
    setIsGenerating(true);
    setCopyError("");
    setStatus("Preparing a local sample draft.");
    onStatusChange?.("Preparing a local sample draft.");
    try {
      const description = selectedHighlights.length ? selectedHighlights.join(", ").toLowerCase() : "the experience";
      const detailText = detail.trim() ? ` I especially appreciated ${detail.trim()}.` : "";
      const occasionText = occasion.trim() ? ` During ${occasion.trim()},` : "";
      const ending = tone === "SHORT_DIRECT" ? " Thank you!" : tone === "ENTHUSIASTIC" ? " I really enjoyed my visit!" : tone === "DETAILED" ? " The team made the visit memorable." : " Thank you to the team.";
      const sample = `Local sample draft — please replace this with your own genuine experience.${occasionText} I visited Marina Bay Sands Singapore. My ${rating}-star impression included ${description}.${detailText}${ending}${customerName.trim() ? ` — ${customerName.trim()}` : ""}`;
      setReviewText(sample);
      setHasDraft(true);
      setStatus("Your editable local sample draft is ready.");
      onStatusChange?.("Your editable local sample draft is ready. Return to Customer View to review it.");
      if (activeRef.current) window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (activeRef.current) {
            demoFooterRef.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
              block: "end",
              inline: "nearest",
            });
          }
        });
      });
    } finally {
      pendingRef.current = false;
      setIsGenerating(false);
    }
  };

  const copyReview = async () => {
    if (!reviewText.trim()) {
      setCopyError("Write a draft before copying it.");
      return false;
    }
    try {
      await navigator.clipboard.writeText(reviewText);
      setCopied(true);
      setCopyError("");
      setStatus("Draft copied to clipboard.");
      onStatusChange?.("Draft copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      setCopied(false);
      setCopyError("Could not copy automatically. Select the draft text above and copy it manually before continuing to Google.");
      setStatus("");
      onStatusChange?.("Could not copy automatically. Select and copy your draft manually.");
      return false;
    }
  };

  const copyAndOpenGoogle = async () => {
    if (await copyReview()) onStatusChange?.("Local sample copied. Google handoff is disabled in this design preview.");
  };

  const moveRating = (event: KeyboardEvent<HTMLButtonElement>, value: number) => {
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp": next = value === 5 ? 1 : value + 1; break;
      case "ArrowLeft":
      case "ArrowDown": next = value === 1 ? 5 : value - 1; break;
      case "Home": next = 1; break;
      case "End": next = 5; break;
      default: return;
    }
    event.preventDefault();
    setRating(next);
    ratingRefs.current[next - 1]?.focus();
  };

  const shareDemo = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  };

  return (
    <section id="review-demo" className="relative min-w-0 border-b border-zinc-200 bg-slate-50 py-8 dark:border-zinc-800 dark:bg-slate-950 sm:px-4 sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="editorial-grid absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="absolute -right-48 top-24 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full min-w-0 max-w-md md:max-w-5xl">
        <div className="mx-auto mb-4 text-center sm:mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Live Customer Preview</p>
          <h3 className="mx-auto mt-2 max-w-3xl font-display text-xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-2xl">
            Try an editable review draft
          </h3>
        </div>

        <div className="grid min-w-0 gap-4 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4 md:grid-cols-2 md:gap-6 md:p-6">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:col-span-2">
            <span>Interactive review demo</span>
            <span className="inline-flex items-center"><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Interactive</span>
          </div>
          <header className="relative min-w-0 min-h-[220px] rounded-xl bg-[linear-gradient(130deg,#0c1a39_0%,#173c69_44%,#0b142b_100%)] sm:min-h-[260px] md:row-span-2 md:min-h-[440px]">
            {!headerImageFailed && (
              <img
                src={demoHeaderImage}
                alt="Exterior of Marina Bay Sands Singapore"
                className="absolute inset-0 h-full w-full rounded-xl object-cover"
                fetchPriority="high"
                onError={() => setHeaderImageFailed(true)}
              />
            )}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#050713]/90 via-[#050713]/25 to-[#050713]/10" />
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <LanguageSelector value={language} onChange={setLanguage} />
            </div>
            <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">
              <h3 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">Marina Bay Sands Singapore</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/85">
                <span>Illustrative hotel experience</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />10 Bayfront Avenue, Singapore</span>
              </div>
            </div>
          </header>
           <p className="min-w-0 text-xs leading-relaxed text-muted-foreground md:col-start-1">Illustrative local sample, not a customer endorsement. External actions and Google posting are disabled in this design preview. Only submit a review based on your genuine visit.</p>

          <div className="min-w-0 rounded-xl border border-zinc-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4 md:col-start-2">
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
              <Button asChild size="sm" className="min-h-[44px] w-full rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-150 hover:bg-indigo-700 active:scale-95 sm:w-auto sm:px-5 sm:text-sm">
                <a href="#"><Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Call</a>
              </Button>
              <Button variant="outline" size="sm" className="min-h-[44px] w-full rounded-xl border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition-all duration-150 hover:bg-indigo-100 active:scale-95 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 sm:w-auto sm:px-4 sm:text-sm" onClick={() => onStatusChange?.("Save Contact is disabled in this design preview.")}>
                <IdCard className="mr-1.5 h-4 w-4 text-[#5b83ff]" aria-hidden="true" />Save Contact
              </Button>
            </div>
            <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2">
              <Button asChild variant="outline" size="sm" aria-label="Directions" title="Directions" className="min-h-[44px] min-w-[44px] rounded-xl border-emerald-200 bg-emerald-50 p-0 text-emerald-700 transition-all duration-150 hover:bg-emerald-100 active:scale-95">
                <a href="#"><MapPin className="h-5 w-5 text-[#19b892]" aria-hidden="true" /></a>
              </Button>
              <Button variant="outline" size="sm" aria-label={shared ? "Link copied" : "Share"} title={shared ? "Link copied" : "Share"} className="min-h-[44px] min-w-[44px] rounded-xl border-indigo-200 bg-indigo-50 p-0 text-indigo-600 transition-all duration-150 hover:bg-indigo-100 active:scale-95" onClick={() => void shareDemo()}>
                {shared ? <Check className="h-5 w-5 text-[#19d7a5]" aria-hidden="true" /> : <Share2 className="h-5 w-5 text-[#9f7aea]" aria-hidden="true" />}
              </Button>
              <a href="#" aria-label="Website (design preview only)" title="Website" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-all duration-150 hover:bg-indigo-100 active:scale-95"><Globe className="h-5 w-5" aria-hidden="true" /></a>
              <a href="#" aria-label="Google Maps (design preview only)" title="Google Maps" className="flex min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-150 hover:bg-indigo-50 active:scale-95"><img src={GOOGLE_MAPS_ICON} alt="" className="h-7 w-7 object-contain" /></a>
              <a href="#" aria-label="Instagram (design preview only)" title="Instagram" className="flex min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-150 hover:bg-indigo-50 active:scale-95"><img src={INSTAGRAM_ICON} alt="" className="h-7 w-7 object-contain" /></a>
            </div>
          </div>

          <section className="mx-auto w-full min-w-0 max-w-[760px] space-y-4 px-0 pb-2 pt-1 md:col-start-2" dir={rtl ? "rtl" : "ltr"}>
             {!hasDraft ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2860c8] dark:text-[#82b3ff]">Step 1</p>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                   <div className="min-w-0">
                    <h4 className="font-display text-2xl font-semibold tracking-tight text-foreground">{strings.ratingQuestion}</h4>
                       <div className="mt-3 flex w-full min-w-0 justify-between gap-0.5 sm:justify-start sm:gap-1" role="radiogroup" aria-label={strings.ratingQuestion}>
                      {[1, 2, 3, 4, 5].map((value) => (
                           <button key={value} ref={(element) => { ratingRefs.current[value - 1] = element; }} type="button" role="radio" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-checked={rating === value} tabIndex={rating === value || (rating === null && value === 1) ? 0 : -1} onKeyDown={(event) => moveRating(event, value)} onClick={() => setRating(value)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-2xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
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
                            <button key={highlight} type="button" aria-pressed={selectedHighlights.includes(highlight)} onClick={() => toggleHighlight(highlight)} className={cn("min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:border-indigo-500 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200", selectedHighlights.includes(highlight) && "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700")}>{highlight}</button>
                        ))}
                      </div>
                       <label className="mt-4 block text-sm font-medium text-foreground">{strings.mentionLabel}
                         <input value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={60} placeholder={strings.mentionPlaceholder} className="mt-2 w-full min-w-0 rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                       </label>
                    </div>
                    <div>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 3</p>
                      <h4 className="mb-3 font-display text-2xl font-semibold tracking-tight text-foreground">{strings.toneTitle}</h4>
                      <div className="grid grid-cols-2 gap-2.5">
                         {tones.map((option) => <button key={option.value} type="button" aria-pressed={tone === option.value} onClick={() => setTone(option.value)} className={cn("min-h-[44px] min-w-0 rounded-xl border px-2 py-3 text-start text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-3.5", tone === option.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background/70 text-foreground hover:border-primary/50 hover:bg-accent")}>{strings[option.key]}</button>)}
                      </div>
                       <p className="mt-2 text-xs text-muted-foreground">{tone ? `${strings.toneTitle}: ${strings[tones.find((option) => option.value === tone)!.key]}` : `${strings.toneTitle}: ${strings.toneWarm}`}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                       <label className="min-w-0 text-sm font-medium text-foreground">{strings.namePlaceholder}
                         <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={60} placeholder={strings.namePlaceholder} className="mt-2 w-full min-w-0 rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                       </label>
                       <label className="min-w-0 text-sm font-medium text-foreground">{strings.occasionPlaceholder}
                         <input value={occasion} onChange={(event) => setOccasion(event.target.value)} maxLength={60} placeholder={strings.occasionPlaceholder} className="mt-2 w-full min-w-0 rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                       </label>
                    </div>
                  </div>
                )}

                  <Button className="mt-5 h-auto min-h-[44px] w-full min-w-0 whitespace-normal rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-colors duration-150 hover:bg-indigo-700 disabled:!opacity-100 disabled:bg-indigo-300" size="lg" disabled={!rating || isGenerating} onClick={() => void generateReview()}>
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{strings.generatingButton}</> : <><Sparkles className="mr-2 h-4 w-4" />{strings.generateButton}</>}
                </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">{!rating ? "Choose a rating to generate a draft. " : ""}Local sample only; you can read and edit your draft. Nothing is posted automatically.</p>
              </div>
            ) : (
               <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-zinc-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-200 sm:p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ready when you are</p>
                 <h4 className="font-display text-2xl font-semibold tracking-tight text-foreground">Your local sample draft is ready.</h4>
                  <textarea value={reviewText} onChange={(event) => { setReviewText(event.target.value); setCopied(false); }} rows={6} aria-label="Generated Google review" className="mt-5 w-full min-w-0 resize-y rounded-xl border border-indigo-200 bg-white px-4 py-3 text-base leading-relaxed text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-900 dark:bg-zinc-900 dark:text-zinc-200" />
                 <p className="mt-3 text-sm text-muted-foreground">This draft is yours to edit or discard. Nothing is posted automatically. Google may ask you to sign in before you publish.</p>
                 {copyError && <p className="mt-3 text-sm text-destructive" role="alert">{copyError}</p>}
                 <div className="mt-6 grid gap-2 sm:grid-cols-2">
                   <Button variant="outline" className="min-h-[44px] w-full rounded-xl" disabled={!reviewText.trim()} onClick={() => void copyReview()}><Copy className="mr-2 h-4 w-4" aria-hidden="true" />{copied ? strings.copiedLabel : "Copy draft"}</Button>
                    <Button className="h-auto min-h-[44px] w-full min-w-0 whitespace-normal rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-colors duration-150 hover:bg-indigo-700" disabled={!reviewText.trim()} onClick={() => void copyAndOpenGoogle()}>
                    {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                      Copy sample (Google disabled)
                  </Button>
                </div>
                 <Button variant="ghost" className="mt-3 h-10 w-full text-sm text-muted-foreground" onClick={() => { setReviewText(""); setHasDraft(false); setCopied(false); setCopyError(""); setStatus(""); }}>{strings.regenerateButton}</Button>
              </div>
            )}
             <p className="sr-only" role="status" aria-live="polite">{status}</p>
          </section>
          <div ref={demoFooterRef} className="scroll-mb-4 flex items-center justify-center gap-3 border-t border-[#d8e2fb] bg-[#eef3ff] py-5 text-xs text-muted-foreground dark:border-white/10 dark:bg-[#0a1430] md:col-span-2">
            <span>Powered by</span>
            <BrandLogo className="h-8 w-auto max-w-[11rem] opacity-90" />
          </div>
        </div>
      </div>
    </section>
  );
}
