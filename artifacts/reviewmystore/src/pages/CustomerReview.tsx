import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useParams } from "wouter";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Globe,
  IdCard,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadVCard } from "@/lib/vcard";
import { objectUrl } from "@/lib/imageUtils";
import { isRtlLanguage } from "@/lib/languages";
import { getReviewPageStrings } from "@/lib/reviewPageTranslations";
import { LanguageSelector } from "@/components/customer-review/LanguageSelector";
import { PrivateFeedbackModal } from "@/components/customer-review/PrivateFeedbackModal";

const socialAssetBase = `${import.meta.env.BASE_URL}social`;
const WHATSAPP_ICON = `${socialAssetBase}/whatsapp.png`;
const INSTAGRAM_ICON = `${socialAssetBase}/instagram.png`;
const GOOGLE_MAPS_ICON = `${socialAssetBase}/google-maps.png`;
const GOOGLE_REVIEWS_LOGO = `${socialAssetBase}/google-reviews.png`;

const LOW_RATING_THRESHOLD = 3; // ratings below this trigger the private-feedback modal
const TONE_OPTIONS = [
  { value: ReviewTone.ENTHUSIASTIC, key: "toneEnthusiastic" as const },
  { value: ReviewTone.SHORT_DIRECT, key: "toneShort" as const },
  { value: ReviewTone.DETAILED, key: "toneDetailed" as const },
  { value: ReviewTone.WARM, key: "toneWarm" as const },
];

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
                displayed !== null && star <= displayed ? "fill-warning text-warning" : "fill-transparent text-muted-foreground/40",
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
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [headerImageFailed, setHeaderImageFailed] = useState(false);
  const sessionId = useMemo(() => getOrCreateSessionId(businessSlug, campaignSlug), [businessSlug, campaignSlug]);

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

  const { business, campaign, keywords, googleReviewUrl } = data;
  // The default language only becomes known once the page has loaded, so a
  // selector opened before that would show "en" then jump — seed it lazily
  // instead of in useState's initializer.
  if (!languageTouched && language === null && business.defaultLanguage !== "en") {
    setLanguage(business.defaultLanguage);
    setLanguageTouched(true);
  }

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
    directionsHref && { kind: "image", key: "directions", href: directionsHref, label: "Get directions", image: GOOGLE_MAPS_ICON },
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
    <div className="review-noise min-h-[100dvh] overflow-hidden bg-background">
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

      <header className="relative mx-3 mt-3 h-56 overflow-hidden rounded-[1.75rem] sm:mx-5 sm:mt-5 sm:h-72 lg:mx-8">
        <div className="absolute inset-0" style={coverStyle} />
        {headerImage && !headerImageFailed && (
          <img
            src={headerImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setHeaderImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 via-foreground/10 to-transparent" />
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LanguageSelector
            value={effectiveLanguage}
            onChange={(code) => {
              setLanguage(code);
              setLanguageTouched(true);
            }}
          />
        </div>
        <div className="relative flex h-full items-end p-5 sm:p-8 lg:p-10">
          <div className="max-w-md text-primary-foreground">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-foreground/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                A note from a local favorite
              </div>
              {business.googleVerified && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-foreground/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  Google Verified
                </div>
              )}
            </div>
            <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Your experience matters.
            </p>
            {business.googleRating !== null && (
              <div className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                {business.googleRating.toFixed(1)}
                {business.googleReviewCount !== null && (
                  <span className="text-primary-foreground/80">({business.googleReviewCount.toLocaleString()} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 pb-14 pt-5 sm:px-6 sm:pt-7 lg:grid-cols-[290px_minmax(0,650px)] lg:justify-center lg:gap-10 lg:px-8 lg:pt-0">
        <aside className="lg:-mt-14">
          <div className="rounded-[1.5rem] border border-border bg-card/95 p-5 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.42)] backdrop-blur sm:p-6">
            <div className="flex items-center gap-4 lg:block lg:text-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md lg:mx-auto lg:h-24 lg:w-24">
                {business.logoUrl && !logoFailed ? (
                  <img
                    src={objectUrl(business.logoUrl)}
                    alt={`${business.name} logo`}
                    className="h-full w-full object-cover"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <span className="font-display text-4xl font-semibold text-primary">{business.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 lg:mt-4">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{business.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{business.category}</p>
              </div>
            </div>

            {business.welcomeMessage && <p className="mt-5 border-t border-border pt-5 text-sm leading-6 text-muted-foreground lg:text-center">{business.welcomeMessage}</p>}

            {(business.address || business.phone) && (
              <div className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                {business.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{business.address}</span>
                  </p>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    {business.phone}
                  </a>
                )}
              </div>
            )}

            {(business.phone || business.address || business.website) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 w-full"
                onClick={() => downloadVCard({ name: business.name, phone: business.phone, address: business.address, website: business.website })}
              >
                <IdCard className="mr-2 h-4 w-4" aria-hidden="true" />
                Save contact
              </Button>
            )}

            {socialLinks.length > 0 && (
              <div className="mt-5 flex items-center justify-center gap-2 border-t border-border pt-5" aria-label="Business links">
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target={link.key === "call" ? undefined : "_blank"}
                    rel={link.key === "call" ? undefined : "noopener noreferrer"}
                    aria-label={link.label}
                    title={link.label}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      link.kind === "image" ? "bg-transparent" : cn("text-primary-foreground", link.className),
                    )}
                  >
                    {link.kind === "image" ? <img src={link.image} alt="" className="h-full w-full object-cover" /> : <link.icon className="h-4 w-4" aria-hidden="true" />}
                  </a>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Campaign · {campaign.name}</p>
        </aside>

        <section className="space-y-4 lg:pt-7" dir={rtl ? "rtl" : "ltr"}>
          {!hasGenerated ? (
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.42)] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Step 1</p>
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

              {generateReview.isError && <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">We couldn't write that review just now. Please try again.</p>}
              <Button className="h-12 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/15" size="lg" disabled={!rating || generateReview.isPending} onClick={handleGenerate}>
                {generateReview.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> {strings.generatingButton}</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> {strings.generateButton}</>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">You'll get to read and edit it before anything is posted.</p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.42)] sm:p-7">
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

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => handleCopy()}>
                  {copied ? <Check className="mr-2 h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {copied ? strings.copiedLabel : strings.copyAndOpenButton}
                </Button>
                {googleReviewUrl ? (
                  <Button asChild className="h-11 rounded-xl shadow-md shadow-primary/15">
                    <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => void handleCopy(true)}>
                      <img src={GOOGLE_REVIEWS_LOGO} alt="" className="mr-2 h-4 w-4 object-contain" />
                      Post to Google <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                ) : (
                  <Button className="h-11 rounded-xl" disabled title="Copy your review and paste it into Google manually">
                    <img src={GOOGLE_REVIEWS_LOGO} alt="" className="mr-2 h-4 w-4 object-contain" />
                    Post to Google <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
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
                  {generateReview.isError && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">We couldn't rewrite that just now. Please try again.</p>}
                  <Button className="mt-6 h-11 w-full rounded-xl" disabled={generateReview.isPending} onClick={handleGenerate}>
                    {generateReview.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> {strings.generatingButton}</> : <><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> {strings.regenerateButton}</>}
                  </Button>
                </div>
              )}
              {!canGenerateMore && <p className="mt-5 border-t border-border pt-4 text-center text-xs leading-5 text-muted-foreground">You've used all available rewrites. You can still edit the review above before posting.</p>}
            </div>
          )}
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Your review goes directly to Google
            <Badge variant="outline" className="ml-1 border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">5-Star.AI</Badge>
          </div>
        </section>
      </main>
    </div>
  );
}
