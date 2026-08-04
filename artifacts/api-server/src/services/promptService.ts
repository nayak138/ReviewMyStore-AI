/**
 * Owns every prompt string used to talk to the AI provider. No other module
 * should inline prompt text — this keeps prompt tuning in one place and
 * keeps `aiService.ts` provider-agnostic (it only knows "system" + "user"
 * strings, never business-specific wording).
 */

export interface ReviewPromptInput {
  businessName: string;
  category: string;
  keywords: string[];
}

const REVIEW_SYSTEM_PROMPT = `You write short, authentic-sounding Google reviews on behalf of real customers who had a genuinely good experience at a local business.

Rules you must always follow:
- Write 2 to 3 sentences, in first person, as if a real customer wrote it.
- Sound natural and specific, not generic or robotic.
- Do NOT use emojis, hashtags, or excessive punctuation.
- Do NOT invent specific facts (prices, dates, employee names, exact quantities) that were not given to you.
- Do NOT mention that the review was AI-generated, written by an assistant, or anything about AI at all.
- Do NOT use marketing language or superlatives that no real customer would say ("unparalleled", "revolutionary", etc.).
- Weave in the provided keywords naturally — do not just list them.
- Output ONLY the review text. No preamble, no quotation marks, no labels.`;

export function buildReviewGenerationPrompt(input: ReviewPromptInput): {
  system: string;
  user: string;
} {
  const keywordList = input.keywords.length > 0 ? input.keywords.join(", ") : "a positive overall experience";

  return {
    system: REVIEW_SYSTEM_PROMPT,
    user: `Business name: ${input.businessName}
Business category: ${input.category}
Things the customer liked: ${keywordList}

Write the review now.`,
  };
}
