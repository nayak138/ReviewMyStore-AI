import { openrouter } from "@workspace/integrations-openrouter-ai";
import { logger } from "../lib/logger";
import {
  buildReviewGenerationPrompt,
  type ReviewPromptInput,
} from "./promptService";

/**
 * Single default model for MVP. Swapping providers/models later should only
 * ever require changing this constant (or promoting it to a DB-backed
 * setting) — never touching call sites in routes or other services.
 */
const REVIEW_MODEL = "openai/gpt-5.4-mini";
/** Keep provider calls bounded so a stalled upstream cannot exhaust request
 * workers or leave a quota reservation pending indefinitely. */
export const AI_REQUEST_TIMEOUT_MS = 45_000;

export class AIGenerationError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

function isTimeoutError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    ["AbortError", "TimeoutError", "APIConnectionTimeoutError"].includes(
      (error as { name?: unknown }).name as string,
    ),
  );
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
    const completion = await openrouter.chat.completions.create(
      {
        model: REVIEW_MODEL,
        max_tokens: 8192,
        temperature: 0.9,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      {
        timeout: AI_REQUEST_TIMEOUT_MS,
        maxRetries: 0,
      },
    );

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
    const timedOut = isTimeoutError(err);
    throw new AIGenerationError(
      timedOut
        ? "AI generation timed out. Please try again."
        : "AI generation is temporarily unavailable. Please try again.",
      timedOut ? 504 : 502,
      err,
    );
  }
}

export interface ReviewReplyDraftInput {
  businessName: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  organizationId?: string;
}

/** Generates a reply draft only. Publishing always remains an explicit,
 * authenticated user action in the review-management route. */
export async function generateReviewReplyDraft(
  input: ReviewReplyDraftInput,
): Promise<string> {
  const startedAt = Date.now();
  const context = {
    model: REVIEW_MODEL,
    organizationId: input.organizationId,
    rating: input.rating,
  };
  const reviewText =
    input.reviewText.trim() || "(The customer left no written comment.)";
  const tone =
    input.rating <= 2
      ? "empathetic, calm, and focused on taking the conversation offline"
      : "warm, specific, and appreciative";

  try {
    const completion = await openrouter.chat.completions.create(
      {
        model: REVIEW_MODEL,
        max_tokens: 350,
        temperature: 0.45,
        messages: [
          {
            role: "system",
            content:
              "You draft concise, professional Google Business review replies. " +
              "Return only the reply text, with no title, quote marks, markdown, or sign-off template. " +
              "Never claim facts not in the review, admit legal liability, offer compensation, request private data, or mention AI. " +
              "This is a human-reviewed draft and must be safe to edit before publishing.",
          },
          {
            role: "user",
            content: [
              `Business: ${input.businessName}`,
              `Reviewer: ${input.reviewerName}`,
              `Rating: ${input.rating}/5`,
              `Desired tone: ${tone}`,
              `Review: ${reviewText}`,
              "Write a single reply of 40-90 words.",
            ].join("\n"),
          },
        ],
      },
      {
        timeout: AI_REQUEST_TIMEOUT_MS,
        maxRetries: 0,
      },
    );
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text)
      throw new AIGenerationError("AI provider returned an empty reply draft");
    logger.info(
      { ...context, latencyMs: Date.now() - startedAt, success: true },
      "AI review reply draft generation succeeded",
    );
    return text;
  } catch (err) {
    logger.error(
      { ...context, latencyMs: Date.now() - startedAt, success: false, err },
      "AI review reply draft generation failed",
    );
    if (err instanceof AIGenerationError) throw err;
    const timedOut = isTimeoutError(err);
    throw new AIGenerationError(
      timedOut
        ? "AI reply drafting timed out. Please try again."
        : "AI reply drafting is temporarily unavailable. Please try again.",
      timedOut ? 504 : 502,
      err,
    );
  }
}
