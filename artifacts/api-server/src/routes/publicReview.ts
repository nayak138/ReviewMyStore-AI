import { Router, type IRouter, type Request } from "express";
import {
  GeneratePublicReviewBody,
  GeneratePublicReviewResponse,
  GetPublicReviewPageResponse,
  SubmitPrivateFeedbackBody,
  SubmitPrivateFeedbackResponse,
} from "@workspace/api-zod";
import {
  PublicCampaignNotFoundError,
  OrganizationQuotaExhaustedError,
  RegenerationLimitReachedError,
  SessionCampaignMismatchError,
  generatePublicReview,
  getPublicReviewPage,
  trackGoogleRedirect,
} from "../services/publicReviewService";
import {
  InvalidFeedbackRatingError,
  submitPrivateFeedback,
} from "../services/privateFeedbackService";
import { requestMeta } from "../services/scanEventService";
import { AIGenerationError } from "../services/aiService";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

/** Per-IP rate limits for public review routes.
 * All endpoints are unauthenticated and track real user activity;
 * a generous-but-bounded limit stops bots from inflating analytics or
 * abusing the AI generation call without affecting genuine visitors. */
const reviewPageRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });
const generateRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });
const tapRateLimit = rateLimit({ windowMs: 60 * 1000, max: 20 });
const feedbackRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5 });

function slugParam(req: Request, name: string): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

router.get(
  "/public/review/:businessSlug/:campaignSlug",
  reviewPageRateLimit,
  async (req, res) => {
    try {
      const page = await getPublicReviewPage(
        slugParam(req, "businessSlug"),
        slugParam(req, "campaignSlug"),
      );
      res.json(GetPublicReviewPageResponse.parse(page));
    } catch (err) {
      if (err instanceof PublicCampaignNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: err.message,
        });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/public/review/:businessSlug/:campaignSlug/generate",
  generateRateLimit,
  async (req, res) => {
    const parsed = GeneratePublicReviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }

    try {
      const result = await generatePublicReview(
        slugParam(req, "businessSlug"),
        slugParam(req, "campaignSlug"),
        parsed.data.sessionId,
        parsed.data.keywords,
        {
          rating: parsed.data.rating,
          tone: parsed.data.tone,
          language: parsed.data.language,
          mentionDetail: parsed.data.mentionDetail,
          customerName: parsed.data.customerName,
          occasion: parsed.data.occasion,
        },
      );
      res.json(GeneratePublicReviewResponse.parse(result));
    } catch (err) {
      if (err instanceof PublicCampaignNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: err.message,
        });
        return;
      }
      if (err instanceof RegenerationLimitReachedError) {
        res.status(429).json({
          success: false,
          code: "REGENERATION_LIMIT_REACHED",
          message: err.message,
        });
        return;
      }
      if (err instanceof SessionCampaignMismatchError) {
        res.status(409).json({
          success: false,
          code: "SESSION_CAMPAIGN_MISMATCH",
          message: "Start a new review session for this campaign.",
        });
        return;
      }
      if (err instanceof OrganizationQuotaExhaustedError) {
        res.status(429).json({
          success: false,
          code: "AI_QUOTA_EXHAUSTED",
          message: "This review service is temporarily unavailable.",
        });
        return;
      }
      if (err instanceof AIGenerationError) {
        res.status(502).json({
          success: false,
          code: "AI_GENERATION_FAILED",
          message: err.message,
        });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/public/review/:businessSlug/:campaignSlug/feedback",
  feedbackRateLimit,
  async (req, res) => {
    const parsed = SubmitPrivateFeedbackBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }

    try {
      await submitPrivateFeedback(
        slugParam(req, "businessSlug"),
        slugParam(req, "campaignSlug"),
        parsed.data,
      );
      res.status(201).json(SubmitPrivateFeedbackResponse.parse({ success: true }));
    } catch (err) {
      if (err instanceof PublicCampaignNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: err.message,
        });
        return;
      }
      if (err instanceof InvalidFeedbackRatingError) {
        res.status(400).json({
          success: false,
          code: "INVALID_RATING",
          message: err.message,
        });
        return;
      }
      throw err;
    }
  },
);

router.post(
  "/public/review/:businessSlug/:campaignSlug/track-redirect",
  tapRateLimit,
  async (req, res) => {
    try {
      await trackGoogleRedirect(
        slugParam(req, "businessSlug"),
        slugParam(req, "campaignSlug"),
        requestMeta(req),
      );
      res.status(204).end();
    } catch (err) {
      if (err instanceof PublicCampaignNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: err.message,
        });
        return;
      }
      throw err;
    }
  },
);

export default router;
