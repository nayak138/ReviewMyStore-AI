import { useState } from "react";
import { Check, Loader2, MessageCircleWarning, X } from "lucide-react";
import { useSubmitPrivateFeedback, type SupportedLanguage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { isRtlLanguage } from "@/lib/languages";
import type { ReviewPageStrings } from "@/lib/reviewPageTranslations";

interface PrivateFeedbackModalProps {
  businessSlug: string;
  campaignSlug: string;
  sessionId: string;
  rating: number;
  language: string;
  strings: ReviewPageStrings;
  onClose: () => void;
}

export function PrivateFeedbackModal({
  businessSlug,
  campaignSlug,
  sessionId,
  rating,
  language,
  strings,
  onClose,
}: PrivateFeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const rtl = isRtlLanguage(language);

  const submitFeedback = useSubmitPrivateFeedback({
    mutation: { onSuccess: () => setSubmitted(true) },
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    submitFeedback.mutate({
      businessSlug,
      campaignSlug,
      data: {
        sessionId,
        rating,
        message: message.trim(),
        contact: contact.trim() || undefined,
        language: language as SupportedLanguage,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-feedback-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="w-full max-w-md rounded-t-[1.75rem] border border-border bg-card p-6 shadow-[0_-24px_70px_-32px_hsl(var(--foreground)/0.5)] sm:rounded-[1.75rem] sm:p-7"
      >
        {submitted ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">{strings.feedbackThanks}</p>
            <Button className="mt-6 w-full rounded-xl" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <MessageCircleWarning className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="private-feedback-title" className="font-display text-xl font-semibold tracking-tight text-foreground">
                    {strings.feedbackModalTitle}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{strings.feedbackModalSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="feedback-message" className="sr-only">{strings.feedbackPlaceholder}</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={strings.feedbackPlaceholder}
              maxLength={1000}
              className="min-h-32 w-full resize-y rounded-2xl border border-input bg-background/70 p-3.5 text-sm leading-6 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <label htmlFor="feedback-contact" className="sr-only">{strings.feedbackContactPlaceholder}</label>
            <input
              id="feedback-contact"
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder={strings.feedbackContactPlaceholder}
              maxLength={200}
              className="mt-3 w-full rounded-2xl border border-input bg-background/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
            />

            {submitFeedback.isError && (
              <p className="mt-3 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert">
                We couldn't send that just now. Please try again.
              </p>
            )}

            <Button
              className="mt-5 h-12 w-full rounded-xl text-sm font-semibold"
              disabled={!message.trim() || submitFeedback.isPending}
              onClick={handleSubmit}
            >
              {submitFeedback.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {strings.feedbackSubmit}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-xl py-2 text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {strings.feedbackSkip}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
