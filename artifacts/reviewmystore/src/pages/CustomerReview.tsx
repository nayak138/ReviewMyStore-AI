import { useMemo, useState } from "react";
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
import { Star, Sparkles, Copy, Check, ExternalLink, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { objectUrl } from "@/lib/imageUtils";

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
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [maxGenerations, setMaxGenerations] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleGenerate = () => {
    if (selectedKeywords.length === 0) return;
    generateReview.mutate({ businessSlug, campaignSlug, data: { sessionId, keywords: selectedKeywords } });
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

      <div className="flex-1 flex justify-center px-4 -mt-12 sm:-mt-14 pb-16">
        <div className="w-full max-w-lg">
          {/* Business identity card */}
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
          </div>

          {/* Keyword picker */}
          {!hasGenerated && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-6">
              <div>
                <h2 className="font-semibold text-foreground mb-1">What did you love?</h2>
                <p className="text-sm text-muted-foreground">Pick a few things — we'll help you write a review in seconds.</p>
              </div>

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

              {keywords.length === 0 && (
                <p className="text-sm text-muted-foreground">No talking points have been set up for this campaign yet.</p>
              )}

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
                      Post to Google <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <Button className="flex-1" disabled title="Copy your review and paste it into Google manually">
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
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canGenerateMore || generateReview.isPending}
                  onClick={handleGenerate}
                >
                  {generateReview.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Regenerate
                </Button>
              </div>
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
