import { Router, type IRouter } from "express";
import {
  GeneratePublicReviewBody,
  GeneratePublicReviewResponse,
} from "@workspace/api-zod";
import { AIGenerationError, generateReviewText } from "../services/aiService";
import { rateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

/**
 * The landing-page demo uses the same AI review writer as a real campaign,
 * but deliberately skips organization quota, sessions, and analytics.
 */
router.post(
  "/public/demo-review/generate",
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
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
      const result = await generateReviewText({
        businessName: "Taj Mahal Palace Mumbai",
        category: "Luxury hotel",
        keywords: parsed.data.keywords,
        rating: parsed.data.rating,
        tone: parsed.data.tone,
        language: parsed.data.language,
        mentionDetail: parsed.data.mentionDetail,
        customerName: parsed.data.customerName,
        occasion: parsed.data.occasion,
      });

      res.json(
        GeneratePublicReviewResponse.parse({
          reviewText: result,
          remainingGenerations: 2,
          maxGenerations: 3,
          language: parsed.data.language ?? "en",
        }),
      );
    } catch (error) {
      if (error instanceof AIGenerationError) {
        res.status(502).json({
          success: false,
          code: "AI_GENERATION_FAILED",
          message: error.message,
        });
        return;
      }
      throw error;
    }
  },
);

export default router;