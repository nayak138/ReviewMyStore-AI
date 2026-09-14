import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useParams } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Copy,
  Facebook,
  Globe,
  IdCard,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  KeywordCategory,
  ReviewTone,
  getGetPublicReviewPageQueryKey,
  useGeneratePublicReview,
  useGetPublicReviewPage,
  type SupportedLanguage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadVCard } from "@/lib/vcard";
import { objectUrl } from "@/lib/imageUtils";
import { isRtlLanguage } from "@/lib/languages";
import { getReviewPageStrings } from "@/lib/reviewPageTranslations";
import { LanguageSelector } from "@/components/customer-review/LanguageSelector";
import { PrivateFeedbackModal } from "@/components/customer-review/PrivateFeedbackModal";
import { BrandIcon } from "@/components/brand-logo";

const socialAssetBase = `${import.meta.env.BASE_URL}social`;
const WHATSAPP_ICON = `${socialAssetBase}/whatsapp.png`;
const INSTAGRAM_ICON = `${socialAssetBase}/instagram.png`;
const landingPageHref = import.meta.env.BASE_URL || "/";

const LOW_RATING_THRESHOLD = 3; // ratings below this trigger the private-feedback modal
const TONE_OPTIONS = [
  { value: ReviewTone.ENTHUSIASTIC, key: "toneEnthusiastic" as const },
  { value: ReviewTone.SHORT_DIRECT, key: "toneShort" as const },
  { value: ReviewTone.DETAILED, key: "toneDetailed" as const },
  { value: ReviewTone.WARM, key: "toneWarm" as const },
];

function publicReviewGenerationErrorMessage(error: unknown, fallback: string): string {
  const typedError = error as {
    status?: number;
    data?: { code?: string; message?: string };
  };

  if (typedError.data?.code === "REGENERATION_LIMIT_REACHED") {
    return "This review session has used all available rewrites. You can still edit any review already written above.";
  }
  if (typedError.data?.code === "AI_QUOTA_EXHAUSTED") {
    return "This review service is temporarily unavailable. Please try again later.";
  }
  if (typedError.status === 429) {
    return "Too many attempts in a short period. Please wait a minute and try again.";
  }
  return typedError.data?.message || fallback;
}

interface KeywordOption {
  id: string;
  label: string;
}

interface KeywordPickerProps {
  productKeywords: KeywordOption[];
  experienceKeywords: KeywordOption[];
  totalKeywordCount: number;
  selectedKeywords: string[];
  toggleKeyword: (label: string) => void;
  removeKeyword: (label: string) => void;
  customKeywordInput: string;
  setCustomKeywordInput: (value: string) => void;
  addCustomKeyword: () => void;
  onCustomKeywordKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  offeringsLabel: string;
  experienceLabel: string;
}

function KeywordPicker({
  productKeywords,
  experienceKeywords,
  totalKeywordCount,
  selectedKeywords,
  toggleKeyword,
  removeKeyword,
  customKeywordInput,
  setCustomKeywordInput,
  addCustomKeyword,
  onCustomKeywordKeyDown,
  offeringsLabel,
  experienceLabel,
}: KeywordPickerProps) {
  const presetLabels = new Set([...productKeywords, ...experienceKeywords].map((keyword) => keyword.label));
  const customSelected = selectedKeywords.filter((keyword) => !presetLabels.has(keyword));

  const renderGroup = (title: string, options: KeywordOption[], accent: "primary" | "accent") =>
    options.length > 0 ? (
      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", accent === "primary" ? "bg-primary" : "bg-accent-foreground/60")} />
          {title}
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((keyword) => {
            const isSelected = selectedKeywords.includes(keyword.label);
            return (
              <button
                key={keyword.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleKeyword(keyword.label)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background/70 text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent",
                )}
              >
                {keyword.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    ) : null;

  return (
    <div className="space-y-5">
      {renderGroup(offeringsLabel, productKeywords, "primary")}
      {renderGroup(experienceLabel, experienceKeywords, "accent")}

      {totalKeywordCount === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          No talking points were set up for this campaign. Add a detail below to make your review personal.
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Add your own</legend>
        {customSelected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {customSelected.map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                {label}
                <button
                  type="button"
                  onClick={() => removeKeyword(label)}
                  aria-label={`Remove ${label}`}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="custom-keyword">Add a detail</label>
          <input
            id="custom-keyword"
            type="text"
            value={customKeywordInput}
            onChange={(event) => setCustomKeywordInput(event.target.value)}
            onKeyDown={onCustomKeywordKeyDown}
            placeholder="A detail worth mentioning"
            maxLength={40}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button type="button" variant="outline" size="icon" onClick={addCustomKeyword} disabled={!customKeywordInput.trim()} aria-label="Add detail">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </fieldset>
    </div>
  );
}

function getOrCreateSessionId(businessSlug: string, campaignSlug: string): string {
  const key = `rms_review_session_${businessSlug}_${campaignSlug}`;
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function ReviewStars() {
  return (
    <div className="flex gap-1" aria-label="Five star review">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-5 w-5 fill-warning text-warning" aria-hidden="true" />
      ))}
    </div>
  );
}

interface RatingInputProps {
  value: number | null;
  onChange: (rating: number) => void;
  labels: [string, string, string, string, string];
  starsWord: string;
  question: string;
}

function RatingInput({ value, onChange, labels, starsWord, question }: RatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? value;

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">{question}</p>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={question}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${starsWord}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(star)}
            className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Star
              className={cn(
                "h-9 w-9 transition-colors sm:h-10 sm:w-10",
                 displayed !== null && star <= displayed ? "fill-warning text-warning" : "fill-transparent text-[#9aaed3] dark:text-[#7395ca]",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      {displayed !== null && (
        <p className="mt-2 text-sm font-semibold text-foreground">
          {labels[displayed - 1]} <span className="font-normal text-muted-foreground">({displayed} {starsWord})</span>
        </p>
      )}
    </div>
  );
}

function LoadingReviewPage() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-52 w-full rounded-[2rem] bg-muted/70 sm:h-64" />
        <div className="mx-auto -mt-10 grid max-w-5xl gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="mx-auto h-20 w-20 rounded-2xl" />
            <Skeleton className="mx-auto h-5 w-40" />
            <Skeleton className="mx-auto h-4 w-28" />
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UnavailableReviewPage() {
  return (
    <div className="review-noise flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-center shadow-[0_24px_80px_-42px_hsl(var(--foreground)/0.35)] sm:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Link unavailable</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">This review page has moved</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The link may be expired, disabled, or mistyped. Please ask the business for an updated review link.
        </p>
      </div>
    </div>
  );
}

export default function CustomerReview() {
  const params = useParams<{ businessSlug: string; campaignSlug: string }>();
  const { businessSlug, campaignSlug } = params;
  const { data, isLoading, isError } = useGetPublicReviewPage(businessSlug, campaignSlug, {
    query: { queryKey: getGetPublicReviewPageQueryKey(businessSlug, campaignSlug) },
  });

  const [rating, setRating] = useState<number | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState("");
  const [mentionDetail, setMentionDetail] = useState("");
  const [tone, setTone] = useState<(typeof ReviewTone)[keyof typeof ReviewTone]>(ReviewTone.ENTHUSIASTIC);
  const [customerName, setCustomerName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [languageTouched, setLanguageTouched] = useState(false);
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [maxGenerations, setMaxGenerations] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [headerImageFailed, setHeaderImageFailed] = useState(false);
  const sessionId = useMemo(() => getOrCreateSessionId(businessSlug, campaignSlug), [businessSlug, campaignSlug]);

  useEffect(() => {
    if (!data?.business.defaultLanguage || languageTouched) return;
    setLanguage((current) => current ?? data.business.defaultLanguage);
  }, [data?.business.defaultLanguage, languageTouched]);

  const effectiveLanguage = language ?? data?.business.defaultLanguage ?? "en";
  const strings = useMemo(() => getReviewPageStrings(effectiveLanguage), [effectiveLanguage]);
  const rtl = isRtlLanguage(effectiveLanguage);

  const generateReview = useGeneratePublicReview({
    mutation: {
      onSuccess: (result) => {
        setReviewText(result.reviewText);
        setRemaining(result.remainingGenerations);
        setMaxGenerations(result.maxGenerations);
      },
    },
  });

  if (isLoading) return <LoadingReviewPage />;
  if (isError || !data) return <UnavailableReviewPage />;

  const { business, keywords, googleReviewUrl } = data;
  const productKeywords = keywords.filter((keyword) => keyword.category === KeywordCategory.PRODUCT_SERVICE);
  const experienceKeywords = keywords.filter((keyword) => keyword.category === KeywordCategory.EXPERIENCE);
  const brandColor = business.brandColor || undefined;
  const hasGenerated = reviewText !== null;
  const canGenerateMore = remaining === null || remaining > 0;
  const whatsappHref = business.whatsappNumber ? `https://wa.me/${business.whatsappNumber.replace(/[^0-9]/g, "")}` : null;
  const directionsHref = business.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`
    : null;
  const headerImage = objectUrl(business.headerImageUrl);

  type SocialLink =
    | { kind: "icon"; key: string; href: string; label: string; icon: typeof Globe; className: string }
    | { kind: "image"; key: string; href: string; label: string; image: string };

  const socialLinks: SocialLink[] = [
    business.website && { kind: "icon", key: "website", href: business.website, label: "Website", icon: Globe, className: "bg-primary" },
    business.instagramUrl && { kind: "image", key: "instagram", href: business.instagramUrl, label: "Instagram", image: INSTAGRAM_ICON },
    business.facebookUrl && { kind: "icon", key: "facebook", href: business.facebookUrl, label: "Facebook", icon: Facebook, className: "bg-primary" },
    whatsappHref && { kind: "image", key: "whatsapp", href: whatsappHref, label: "WhatsApp", image: WHATSAPP_ICON },
    business.phone && { kind: "icon", key: "call", href: `tel:${business.phone}`, label: "Call", icon: Phone, className: "bg-destructive" },
  ].filter((link): link is SocialLink => Boolean(link));

  const toggleKeyword = (label: string) => {
    setSelectedKeywords((current) => (current.includes(label) ? current.filter((keyword) => keyword !== label) : [...current, label]));
  };
  const removeKeyword = (label: string) => setSelectedKeywords((current) => current.filter((keyword) => keyword !== label));
  const addCustomKeyword = () => {
    const value = customKeywordInput.trim().slice(0, 40);
    if (!value) return;
    setSelectedKeywords((current) => (current.some((keyword) => keyword.toLowerCase() === value.toLowerCase()) ? current : [...current, value]));
    setCustomKeywordInput("");
  };
  const handleCustomKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomKeyword();
    }
  };
  const handleRatingChange = (nextRating: number) => {
    setRating(nextRating);
    if (nextRating < LOW_RATING_THRESHOLD) setShowFeedbackModal(true);
  };
  const handleGenerate = () => {
    if (!rating) return;
    generateReview.mutate(
      {
        businessSlug,
        campaignSlug,
        data: {
          sessionId,
          keywords: selectedKeywords,
          rating,
          tone,
          language: effectiveLanguage as SupportedLanguage,
          mentionDetail: mentionDetail.trim() || undefined,
          customerName: customerName.trim() || undefined,
          occasion: occasion.trim() || undefined,
        },
      },
      { onSuccess: () => setIsEditingKeywords(false) },
    );
  };
  const handleCopy = async (clickedThroughToGoogle = false) => {
    if (!reviewText) return;
    if (clickedThroughToGoogle) {
      const trackUrl = `${import.meta.env.BASE_URL}api/v1/public/review/${businessSlug}/${campaignSlug}/track-redirect`;
      try {
        if (!navigator.sendBeacon?.(trackUrl)) {
          void fetch(trackUrl, { method: "POST", keepalive: true }).catch(() => {});
        }
      } catch {
        // Tracking must never prevent a customer from posting.
      }
    }
    try {
      await navigator.clipboard.writeText(reviewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const handleCopyAndOpen = async () => {
    if (!reviewText) return;
    if (googleReviewUrl) {
      window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
    }
    await handleCopy(Boolean(googleReviewUrl));
  };
  const handleShare = async () => {
    const shareData = {
      title: business.name,
      text: `Check out ${business.name}`,
      url: window.location.href,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  };

  const coverStyle: CSSProperties = brandColor
    ? { backgroundColor: `${brandColor}20` }
    : { backgroundColor: "hsl(var(--primary) / 0.12)" };

  const pickerProps: KeywordPickerProps = {
    productKeywords,
    experienceKeywords,
    totalKeywordCount: keywords.length,
    selectedKeywords,
    toggleKeyword,
    removeKeyword,
    customKeywordInput,
    setCustomKeywordInput,
    addCustomKeyword,
    onCustomKeywordKeyDown: handleCustomKeywordKeyDown,
    offeringsLabel: strings.offeringsGroup,
    experienceLabel: strings.experienceGroup,
  };

  return (
    <div className="review-noise min-h-[100dvh] overflow-hidden bg-[#f1f5ff] px-0 text-foreground dark:bg-[#05091d] sm:px-4">
      {showFeedbackModal && rating !== null && (
        <PrivateFeedbackModal
          businessSlug={businessSlug}
          campaignSlug={campaignSlug}
          sessionId={sessionId}
          rating={rating}
          language={effectiveLanguage}
          strings={strings}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      <main className="mx-auto w-full max-w-[920px] overflow-hidden bg-[#f8faff] shadow-[0_28px_100px_-38px_rgba(28,57,125,0.2)] dark:bg-[#0a1430] dark:shadow-[0_28px_100px_-38px_rgba(0,0,0,0.8)] sm:my-5 sm:rounded-[1.75rem]">
        <header className="relative h-[285px] overflow-hidden sm:h-[350px] lg:h-[385px]">
          <div className="absolute inset-0" style={coverStyle} />
          {headerImage && !headerImageFailed && (
            <img
              src={headerImage}
              alt={`${business.name} Google Places photo`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setHeaderImageFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050713]/90 via-[#050713]/20 to-[#050713]/10" />
          <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
            {business.googleVerified && (
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
            )}
          </div>
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
            <LanguageSelector
              value={effectiveLanguage}
              onChange={(code) => {
                setLanguage(code);
                setLanguageTouched(true);
              }}
            />
          </div>
          <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold leading-tight">{business.name}</h1>
              {business.googleVerified && (
                <span
                  title="Verified business"
                  aria-label="Verified business"
                  className="flex h-8 w-8 shrink-0 items-center justify-center sm:h-9 sm:w-9"
                >
                  <BadgeCheck className="h-8 w-8 fill-[#22c875] text-[#075b37] drop-shadow-[0_2px_5px_rgba(34,200,117,0.35)] sm:h-9 sm:w-9" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/85">
              {business.category && <span>{business.category}</span>}
              {business.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{business.address}</span>}
            </div>
            {business.googleRating !== null && (
              <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                <Star className="h-4 w-4 fill-[#fbbc04] text-[#fbbc04]" aria-hidden="true" />
                {business.googleRating.toFixed(1)}
                {business.googleReviewCount !== null && <span className="font-normal text-white/80">({business.googleReviewCount.toLocaleString()})</span>}
              </div>
            )}
          </div>
        </header>

        <div className="border-b border-[#d8e2fb] bg-[#eef3ff] px-4 py-4 sm:px-7 dark:border-white/10 dark:bg-[#0a1430]">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-start">
            {business.phone && (
              <Button asChild size="sm" className="h-11 w-full min-w-0 rounded-full bg-[#1769ff] px-3 text-xs font-semibold shadow-[0_8px_18px_rgba(23,105,255,0.28)] hover:bg-[#0e59df] sm:w-auto sm:px-5 sm:text-sm">
                <a href={`tel:${business.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Call</a>
              </Button>
            )}
            {(business.phone || business.address || business.website) && (
              <Button variant="outline" size="sm" className="h-11 w-full min-w-0 rounded-full border-[#cbd8f5] bg-[#e4ecff] px-3 text-xs font-semibold text-[#20345f] hover:bg-[#d8e4ff] dark:border-white/15 dark:bg-[#172548] dark:text-slate-100 dark:hover:bg-[#21345f] sm:w-auto sm:px-4 sm:text-sm" onClick={() => downloadVCard({ name: business.name, phone: business.phone, address: business.address, website: business.website })}>
                <IdCard className="mr-1.5 h-4 w-4 text-[#5b83ff]" aria-hidden="true" />Save Contact
              </Button>
            )}
          </div>
          <div className="mt-3 flex w-full items-center justify-center gap-2">
            {directionsHref && (
              <Button asChild variant="outline" size="sm" aria-label="Directions" title="Directions" className="h-11 w-11 shrink-0 rounded-xl border-[#a8e5d1] bg-[#ddf8ef] p-0 text-[#087f6a] hover:bg-[#c9f1e4] dark:border-[#2c756e] dark:bg-[#153c43] dark:text-slate-100 dark:hover:bg-[#1c4b51]">
                <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-5 w-5 text-[#19d7a5]" aria-hidden="true" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              aria-label={shareCopied ? "Link copied" : "Share"}
              title={shareCopied ? "Link copied" : "Share"}
              className="h-11 w-11 shrink-0 rounded-xl border-[#d7b8f5] bg-[#f0e5ff] p-0 text-[#7541a8] hover:bg-[#e7d8fa] dark:border-[#65449a] dark:bg-[#32244e] dark:text-slate-100 dark:hover:bg-[#3e2d60]"
              onClick={() => void handleShare()}
            >
              {shareCopied ? <Check className="h-5 w-5 text-[#19d7a5]" aria-hidden="true" /> : <Share2 className="h-5 w-5 text-[#9f7aea]" aria-hidden="true" />}
            </Button>
            {socialLinks.filter((link) => !["call"].includes(link.key)).map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5",
                  link.key === "website"
                    ? "border-[#b9cbf5] bg-[#e3ebff] hover:bg-[#d6e2ff] dark:border-white/15 dark:bg-[#172548] dark:hover:bg-[#21345f]"
                    : link.key === "facebook"
                      ? "border-[#b9cbf5] bg-[#e1eaff] hover:bg-[#d5e2ff] dark:border-white/15 dark:bg-[#172548] dark:hover:bg-[#21345f]"
                      : "border-[#d6def2] bg-white hover:bg-[#f5f7ff] dark:border-white/15 dark:bg-[#172548] dark:hover:bg-[#21345f]",
                )}
              >
                {link.kind === "image" ? <img src={link.image} alt="" className="h-full w-full object-cover" /> : <link.icon className="h-5 w-5 text-secondary-foreground dark:text-slate-200" aria-hidden="true" />}
              </a>
            ))}
          </div>
        </div>

        <section className="mx-auto w-full max-w-[760px] space-y-4 px-4 pb-8 pt-5 sm:px-7" dir={rtl ? "rtl" : "ltr"}>
          {!hasGenerated ? (
             <div className="review-card rounded-[1.5rem] border p-5 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                   <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2860c8] dark:text-[#82b3ff]">Step 1</p>
                  <RatingInput
                    value={rating}
                    onChange={handleRatingChange}
                    labels={[strings.ratingLabel1, strings.ratingLabel2, strings.ratingLabel3, strings.ratingLabel4, strings.ratingLabel5]}
                    starsWord={strings.starsWord}
                    question={strings.ratingQuestion}
                  />
                </div>
                <div className="hidden shrink-0 rounded-2xl bg-accent p-3 text-accent-foreground sm:block">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              {rating !== null && (
                <>
                  <div className="mb-6 border-t border-border pt-6">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 2</p>
                    <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-foreground">{strings.highlightsTitle}</h2>
                    <KeywordPicker {...pickerProps} />
                    <div className="mt-5">
                      <label htmlFor="mention-detail" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {strings.mentionLabel}
                      </label>
                      <input
                        id="mention-detail"
                        type="text"
                        value={mentionDetail}
                        onChange={(event) => setMentionDetail(event.target.value)}
                        placeholder={strings.mentionPlaceholder}
                        maxLength={60}
                        className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>

                  <div className="mb-6 border-t border-border pt-6">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 3</p>
                    <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-foreground">{strings.toneTitle}</h2>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {TONE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={tone === option.value}
                          onClick={() => setTone(option.value)}
                          className={cn(
                            "rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            tone === option.value
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background/70 text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent",
                          )}
                        >
                          {strings[option.key]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder={strings.namePlaceholder}
                      maxLength={60}
                      className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <input
                      type="text"
                      value={occasion}
                      onChange={(event) => setOccasion(event.target.value)}
                      placeholder={strings.occasionPlaceholder}
                      maxLength={60}
                      className="w-full rounded-xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </>
              )}

               {generateReview.isError && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{publicReviewGenerationErrorMessage(generateReview.error, "We couldn't write that review just now. Please try again.")}</p>}
               <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2d7dff] to-[#6264e8] text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(56,103,235,0.75)] hover:from-[#1f6ff0] hover:to-[#5556d8] disabled:!opacity-100 disabled:from-[#2f61b0] disabled:to-[#5555a1] disabled:text-white/85" size="lg" disabled={!rating || generateReview.isPending} onClick={handleGenerate}>
                {generateReview.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> {strings.generatingButton}</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> {strings.generateButton}</>
                )}
              </Button>
               <p className="mt-3 text-center text-xs text-muted-foreground dark:text-[#a8bce0]">You'll get to read and edit it before anything is posted.</p>
            </div>
          ) : (
             <div className="review-card rounded-[1.5rem] border p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Ready when you are</p>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">Your review is ready.</h2>
                </div>
                <ReviewStars />
              </div>
              <label htmlFor="review-text" className="sr-only">Your generated review</label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                dir={rtl ? "rtl" : "ltr"}
                className="mt-6 min-h-44 w-full resize-y rounded-2xl border border-border bg-background/70 p-4 text-[15px] leading-7 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
                aria-describedby="review-edit-hint"
              />
              <p id="review-edit-hint" className="mt-2 text-xs text-muted-foreground">Make it sound like you. A specific, honest detail is always best.</p>

              <div className="mt-6">
                <Button className="h-12 w-full rounded-xl bg-[#1769ff] text-sm font-semibold shadow-[0_8px_20px_rgba(23,105,255,0.22)] hover:bg-[#0e59df]" onClick={() => void handleCopyAndOpen()}>
                  {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {copied ? strings.copiedLabel : strings.copyAndOpenButton}
                </Button>
              </div>
              {!googleReviewUrl && <p className="mt-3 text-center text-xs text-muted-foreground">Your review is copied. Paste it into Google to share it.</p>}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {remaining !== null && maxGenerations !== null ? `${remaining} ${strings.rewritesLeftWord}` : "You can refine this once it's written."}
                </p>
                {canGenerateMore && (
                  <Button variant="ghost" size="sm" className="rounded-lg" disabled={generateReview.isPending} onClick={() => setIsEditingKeywords((current) => !current)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {isEditingKeywords ? "Hide details" : "Change details"}
                  </Button>
                )}
              </div>

              {canGenerateMore && isEditingKeywords && (
                <div className="mt-5 border-t border-border pt-5">
                  <KeywordPicker {...pickerProps} />
                   {generateReview.isError && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{publicReviewGenerationErrorMessage(generateReview.error, "We couldn't rewrite that just now. Please try again.")}</p>}
                  <Button className="mt-6 h-11 w-full rounded-xl" disabled={generateReview.isPending} onClick={handleGenerate}>
                    {generateReview.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> {strings.generatingButton}</> : <><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> {strings.regenerateButton}</>}
                  </Button>
                </div>
              )}
              {!canGenerateMore && <p className="mt-5 border-t border-border pt-4 text-center text-xs leading-5 text-muted-foreground">You've used all available rewrites. You can still edit the review above before posting.</p>}
            </div>
          )}
        </section>
        <footer className="flex items-center justify-center border-t border-[#d8e2fb] bg-[#eef3ff] px-4 py-5 text-xs text-muted-foreground dark:border-white/10 dark:bg-[#0a1430]">
          <a
            href={landingPageHref}
            aria-label="Visit 5-Star.AI"
            className="inline-flex items-center gap-2 rounded-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandIcon className="h-5 w-5 object-contain opacity-80" />
            <span>Powered by 5-Star.AI</span>
          </a>
        </footer>
      </main>
    </div>
  );
}
