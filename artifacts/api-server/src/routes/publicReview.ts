import { Router, type IRouter, type Request } from "express";
import {
  GeneratePublicReviewBody,
  GeneratePublicReviewResponse,
  GetPublicReviewPageResponse,
} from "@workspace/api-zod";
import {
  PublicCampaignNotFoundError,
  RegenerationLimitReachedError,
  generatePublicReview,
  getPublicReviewPage,
} from "../services/publicReviewService";
import { AIGenerationError } from "../services/aiService";

const router: IRouter = Router();

function slugParam(req: Request, name: string): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

router.get(
  "/public/review/:businessSlug/:campaignSlug",
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

export default router;
