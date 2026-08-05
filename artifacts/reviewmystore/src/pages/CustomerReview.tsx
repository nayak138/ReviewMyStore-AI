import { useMemo, useState, type KeyboardEvent } from "react";
import { useParams } from "wouter";
import {
  useGetPublicReviewPage,
  useGeneratePublicReview,
  getGetPublicReviewPageQueryKey,
  KeywordCategory,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Copy, Check, ExternalLink, RefreshCw, AlertTriangle, Loader2, Globe, Facebook, Phone, IdCard, MapPin, Plus, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { objectUrl } from "@/lib/imageUtils";
import { downloadVCard } from "@/lib/vcard";

const socialAssetBase = `${import.meta.env.BASE_URL}social`;
const WHATSAPP_ICON = `${socialAssetBase}/whatsapp.png`;
const INSTAGRAM_ICON = `${socialAssetBase}/instagram.png`;
const GOOGLE_MAPS_ICON = `${socialAssetBase}/google-maps.png`;
const GOOGLE_REVIEWS_LOGO = `${socialAssetBase}/google-reviews.png`;

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
  onCustomKeywordKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
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
}: KeywordPickerProps) {
  const presetLabels = new Set([...productKeywords, ...experienceKeywords].map((k) => k.label));
  const customSelected = selectedKeywords.filter((k) => !presetLabels.has(k));

  return (
    <div className="space-y-5">
      {productKeywords.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Product / Service</h3>
          <div className="flex flex-wrap gap-2">
            {productKeywords.map((kw) => (
              <button
                key={kw.id}
                type="button"
                onClick={() => toggleKeyword(kw.label)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  selectedKeywords.includes(kw.label)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-foreground border-border hover:bg-secondary",
                )}
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {experienceKeywords.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Experience</h3>
          <div className="flex flex-wrap gap-2">
            {experienceKeywords.map((kw) => (
              <button
                key={kw.id}
                type="button"
                onClick={() => toggleKeyword(kw.label)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  selectedKeywords.includes(kw.label)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-foreground border-border hover:bg-secondary",
                )}
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {totalKeywordCount === 0 && (
        <p className="text-sm text-muted-foreground">No talking points have been set up for this campaign yet.</p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Add your own</h3>
        {customSelected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {customSelected.map((label) => (
              <span
                key={label}
                className="pl-3 pr-1.5 py-1.5 rounded-full text-sm border bg-primary text-primary-foreground border-primary flex items-center gap-1.5"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeKeyword(label)}
                  aria-label={`Remove ${label}`}
                  className="rounded-full hover:bg-primary-foreground/20 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={customKeywordInput}
            onChange={(e) => setCustomKeywordInput(e.target.value)}
            onKeyDown={onCustomKeywordKeyDown}
            placeholder="e.g. friendly staff, great value"
            maxLength={40}
            className="flex-1 px-3 py-1.5 rounded-full text-sm border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="button" variant="outline" size="icon" onClick={addCustomKeyword} disabled={!customKeywordInput.trim()} aria-label="Add keyword">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
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

export default function CustomerReview() {
  const params = useParams<{ businessSlug: string; campaignSlug: string }>();
  const { businessSlug, campaignSlug } = params;

  const { data, isLoading, isError } = useGetPublicReviewPage(businessSlug, campaignSlug, {
    query: { queryKey: getGetPublicReviewPageQueryKey(businessSlug, campaignSlug) },
  });

  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState("");
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [maxGenerations, setMaxGenerations] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);

  const sessionId = useMemo(() => getOrCreateSessionId(businessSlug, campaignSlug), [businessSlug, campaignSlug]);

  const generateReview = useGeneratePublicReview({
    mutation: {
      onSuccess: (result) => {
        setReviewText(result.reviewText);
        setRemaining(result.remainingGenerations);
        setMaxGenerations(result.maxGenerations);
      },
    },
  });

  const toggleKeyword = (label: string) => {
    setSelectedKeywords((prev) => (prev.includes(label) ? prev.filter((k) => k !== label) : [...prev, label]));
  };

  const removeKeyword = (label: string) => {
    setSelectedKeywords((prev) => prev.filter((k) => k !== label));
  };

  const addCustomKeyword = () => {
    const value = customKeywordInput.trim().slice(0, 40);
    if (!value) return;
    setSelectedKeywords((prev) => (prev.some((k) => k.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setCustomKeywordInput("");
  };

  const handleCustomKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomKeyword();
    }
  };

  const handleGenerate = () => {
    if (selectedKeywords.length === 0) return;
    generateReview.mutate(
      { businessSlug, campaignSlug, data: { sessionId, keywords: selectedKeywords } },
      { onSuccess: () => setIsEditingKeywords(false) },
    );
  };

  const handleCopy = async (clickedThroughToGoogle = false) => {
    if (!reviewText) return;
    if (clickedThroughToGoogle) {
      // Track the Google click-through BEFORE anything async — the browser is
      // about to navigate away, so use a beacon (survives page unload) rather
      // than a normal request that unload would cancel.
      const trackUrl = `${import.meta.env.BASE_URL}api/v1/public/review/${businessSlug}/${campaignSlug}/track-redirect`;
      try {
        if (!navigator.sendBeacon?.(trackUrl)) {
          void fetch(trackUrl, { method: "POST", keepalive: true }).catch(() => {});
        }
      } catch {
        // never block the redirect on tracking
      }
    }
    try {
      await navigator.clipboard.writeText(reviewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div>
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground">This review page isn't available</h1>
          <p className="text-muted-foreground mt-2 max-w-sm">
            The link may be expired, disabled, or mistyped. Please check with the business for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const { business, campaign, keywords, googleReviewUrl } = data;
  const productKeywords = keywords.filter((k) => k.category === KeywordCategory.PRODUCT_SERVICE);
  const experienceKeywords = keywords.filter((k) => k.category === KeywordCategory.EXPERIENCE);
  const brandColor = business.brandColor || undefined;
  const canGenerateMore = remaining === null || remaining > 0;
  const hasGenerated = reviewText !== null;

  const whatsappHref = business.whatsappNumber
    ? `https://wa.me/${business.whatsappNumber.replace(/[^0-9]/g, "")}`
    : null;
  const directionsHref = business.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`
    : null;

  type SocialLink =
    | { kind: "icon"; key: string; href: string; label: string; icon: typeof Globe; className: string }
    | { kind: "image"; key: string; href: string; label: string; image: string };

  const socialLinks: SocialLink[] = [
    business.website && { kind: "icon", key: "website", href: business.website, label: "Website", icon: Globe, className: "bg-blue-500" },
    business.instagramUrl && { kind: "image", key: "instagram", href: business.instagramUrl, label: "Instagram", image: INSTAGRAM_ICON },
    business.facebookUrl && { kind: "icon", key: "facebook", href: business.facebookUrl, label: "Facebook", icon: Facebook, className: "bg-blue-600" },
    whatsappHref && { kind: "image", key: "whatsapp", href: whatsappHref, label: "WhatsApp", image: WHATSAPP_ICON },
    directionsHref && { kind: "image", key: "directions", href: directionsHref, label: "Get Directions", image: GOOGLE_MAPS_ICON },
    business.phone && { kind: "icon", key: "call", href: `tel:${business.phone}`, label: "Call", icon: Phone, className: "bg-red-500" },
  ].filter((v): v is SocialLink => Boolean(v));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cover / brand header */}
      <div
        className="h-32 sm:h-40 w-full relative shrink-0"
        style={{ backgroundColor: brandColor ? `${brandColor}22` : undefined }}
      >
        {business.coverImageUrl && (
          <img src={objectUrl(business.coverImageUrl)} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* relative z-10: the cover header above is `position: relative`, so without its own
          stacking context this content (pulled up via negative margin) would paint behind it. */}
      <div className="relative z-10 flex-1 flex justify-center px-4 -mt-12 sm:-mt-14 pb-16">
        <div className="w-full max-w-lg">
          {/* Business identity + contact card */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 rounded-2xl border-4 border-background bg-card shadow-md overflow-hidden flex items-center justify-center">
              {business.logoUrl ? (
                <img src={objectUrl(business.logoUrl)} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: brandColor }}>
                  {business.name.charAt(0)}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-4">{business.name}</h1>
            <p className="text-sm text-muted-foreground">{business.category}</p>
            {business.welcomeMessage && (
              <p className="text-sm text-muted-foreground mt-3 max-w-sm">{business.welcomeMessage}</p>
            )}

            {(business.address || business.phone) && (
              <div className="mt-3 text-sm text-muted-foreground space-y-1 max-w-sm">
                {business.address && (
                  <p className="flex items-start justify-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{business.address}</span>
                  </p>
                )}
                {business.phone && <p className="font-medium text-foreground">{business.phone}</p>}
              </div>
            )}

            {(business.phone || business.address || business.website) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  downloadVCard({
                    name: business.name,
                    phone: business.phone,
                    address: business.address,
                    website: business.website,
                  })
                }
              >
                <IdCard className="w-4 h-4 mr-2" /> Save Contact
              </Button>
            )}

            {socialLinks.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm">
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity overflow-hidden",
                      link.kind === "image" ? "bg-transparent" : cn("text-white", link.className),
                    )}
                  >
                    {link.kind === "image" ? (
                      <img src={link.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <link.icon className="w-4 h-4" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Keyword picker */}
          {!hasGenerated && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
              <div>
                <h2 className="font-semibold text-foreground mb-1">What did you love?</h2>
                <p className="text-sm text-muted-foreground">Pick a few things — we'll help you write a review in seconds.</p>
              </div>

              <KeywordPicker
                productKeywords={productKeywords}
                experienceKeywords={experienceKeywords}
                totalKeywordCount={keywords.length}
                selectedKeywords={selectedKeywords}
                toggleKeyword={toggleKeyword}
                removeKeyword={removeKeyword}
                customKeywordInput={customKeywordInput}
                setCustomKeywordInput={setCustomKeywordInput}
                addCustomKeyword={addCustomKeyword}
                onCustomKeywordKeyDown={handleCustomKeywordKeyDown}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={selectedKeywords.length === 0 || generateReview.isPending}
                onClick={handleGenerate}
              >
                {generateReview.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Writing your review...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate My Review
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Generated review */}
          {hasGenerated && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{reviewText}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={() => handleCopy()}>
                  {copied ? <Check className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Review"}
                </Button>
                {googleReviewUrl ? (
                  <Button asChild className="flex-1">
                    <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleCopy(true)}>
                      <img src={GOOGLE_REVIEWS_LOGO} alt="" className="h-4 mr-2" />
                      Post to Google <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <Button className="flex-1" disabled title="Copy your review and paste it into Google manually">
                    <img src={GOOGLE_REVIEWS_LOGO} alt="" className="h-4 mr-2" />
                    Post to Google <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
              {!googleReviewUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  We copied your review to the clipboard — paste it into Google to post it.
                </p>
              )}

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {remaining !== null && maxGenerations !== null
                    ? `${remaining} of ${maxGenerations} regenerations left`
                    : ""}
                </p>
                {canGenerateMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={generateReview.isPending}
                    onClick={() => setIsEditingKeywords((prev) => !prev)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    {isEditingKeywords ? "Hide keywords" : "Change keywords"}
                  </Button>
                )}
              </div>

              {canGenerateMore && isEditingKeywords && (
                <div className="pt-1 space-y-5">
                  <KeywordPicker
                    productKeywords={productKeywords}
                    experienceKeywords={experienceKeywords}
                    totalKeywordCount={keywords.length}
                    selectedKeywords={selectedKeywords}
                    toggleKeyword={toggleKeyword}
                    removeKeyword={removeKeyword}
                    customKeywordInput={customKeywordInput}
                    setCustomKeywordInput={setCustomKeywordInput}
                    addCustomKeyword={addCustomKeyword}
                    onCustomKeywordKeyDown={handleCustomKeywordKeyDown}
                  />
                  <Button
                    className="w-full"
                    disabled={selectedKeywords.length === 0 || generateReview.isPending}
                    onClick={handleGenerate}
                  >
                    {generateReview.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Writing your review...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" /> Regenerate with these keywords
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!canGenerateMore && (
                <p className="text-xs text-center text-muted-foreground">
                  You've used all your regenerations for this review. Feel free to edit the text above before posting.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <Badge variant="outline" className="text-[11px] text-muted-foreground border-border">
              Powered by ReviewMyStore.ai — {campaign.name}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
