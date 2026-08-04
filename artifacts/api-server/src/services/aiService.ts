import { openrouter } from "@workspace/integrations-openrouter-ai";
import { logger } from "../lib/logger";
import { buildReviewGenerationPrompt, type ReviewPromptInput } from "./promptService";

/**
 * Single default model for MVP. Swapping providers/models later should only
 * ever require changing this constant (or promoting it to a DB-backed
 * setting) — never touching call sites in routes or other services.
 */
const REVIEW_MODEL = "openai/gpt-4o-mini";

export class AIGenerationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AIGenerationError";
  }
}

/**
 * The only place in the codebase allowed to call the AI provider. Routes and
 * other services must go through this function — never import `openrouter`
 * directly — so provider swaps, logging, and prompt changes stay isolated
 * here and in `promptService.ts`.
 */
export async function generateReviewText(
  input: ReviewPromptInput & {
    organizationId?: string;
    businessId?: string;
    campaignId?: string;
  },
): Promise<string> {
  const { system, user } = buildReviewGenerationPrompt(input);
  const startedAt = Date.now();
  const context = {
    model: REVIEW_MODEL,
    organizationId: input.organizationId,
    businessId: input.businessId,
    campaignId: input.campaignId,
  };

  try {
    const completion = await openrouter.chat.completions.create({
      model: REVIEW_MODEL,
      max_tokens: 8192,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new AIGenerationError("AI provider returned an empty response");
    }

    logger.info(
      { ...context, latencyMs: Date.now() - startedAt, success: true },
      "AI review generation succeeded",
    );
    return text;
  } catch (err) {
    logger.error(
      { ...context, latencyMs: Date.now() - startedAt, success: false, err },
      "AI review generation failed",
    );
    if (err instanceof AIGenerationError) throw err;
    throw new AIGenerationError("Failed to generate review text", err);
  }
}
