/**
 * Owns every prompt string used to talk to the AI provider. No other module
 * should inline prompt text — this keeps prompt tuning in one place and
 * keeps `aiService.ts` provider-agnostic (it only knows "system" + "user"
 * strings, never business-specific wording).
 */

export type ReviewTone = "ENTHUSIASTIC" | "SHORT_DIRECT" | "DETAILED" | "WARM";

export interface ReviewPromptInput {
  businessName: string;
  category: string;
  keywords: string[];
  rating: number;
  tone: ReviewTone;
  /** ISO-ish language code from the SupportedLanguage OpenAPI enum. Falls back to English if unrecognized. */
  language?: string;
  mentionDetail?: string | null;
  customerName?: string | null;
  occasion?: string | null;
}

// Display names for the AI prompt only (what to ask the model to write in).
// Keep in sync with the `SupportedLanguage` enum in lib/api-spec/openapi.yaml
// and the matching frontend catalog in
// artifacts/reviewmystore/src/lib/languages.ts.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  te: "Telugu",
  mr: "Marathi",
  ta: "Tamil",
  ur: "Urdu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  mai: "Maithili",
  sat: "Santali",
  ks: "Kashmiri",
  ne: "Nepali",
  sd: "Sindhi",
  kok: "Konkani",
  doi: "Dogri",
  mni: "Manipuri (Meitei)",
  sa: "Sanskrit",
  brx: "Bodo",
};

const TONE_INSTRUCTIONS: Record<ReviewTone, string> = {
  ENTHUSIASTIC: "Sound genuinely excited and glowing, like a delighted regular customer raving to a friend.",
  SHORT_DIRECT: "Keep it to 1-2 short, punchy sentences. Direct and to the point, no fluff.",
  DETAILED: "Be more detailed and insightful — mention specifics about the food, service, or atmosphere.",
  WARM: "Sound warm and grateful — like a heartfelt thank-you to the people who made the experience good.",
};

function toneForRating(rating: number): string {
  if (rating <= 2) {
    return "The customer's actual experience was below average. Keep the review honest and measured — do not gush or use five-star superlatives that would contradict a mediocre experience.";
  }
  if (rating === 3) {
    return "The customer's actual experience was average/mixed. Keep the review balanced and fair, mostly positive but not over-the-top.";
  }
  return "The customer's actual experience was very good. Genuine, specific praise is appropriate.";
}

export function buildReviewGenerationPrompt(input: ReviewPromptInput): {
  system: string;
  user: string;
} {
  const keywordList = input.keywords.length > 0 ? input.keywords.join(", ") : "a positive overall experience";
  const languageCode = input.language && LANGUAGE_NAMES[input.language] ? input.language : "en";
  const languageName = LANGUAGE_NAMES[languageCode];

  const system = `You write short, authentic-sounding Google reviews on behalf of real customers.

Rules you must always follow:
- Write 2 to 4 sentences, in first person, as if a real customer wrote it.
- Sound natural and specific, not generic or robotic.
- Do NOT use emojis, hashtags, or excessive punctuation.
- Do NOT invent specific facts (prices, dates, employee names, exact quantities) that were not given to you.
- Do NOT mention that the review was AI-generated, written by an assistant, or anything about AI at all.
- Do NOT use marketing language or superlatives that no real customer would say ("unparalleled", "revolutionary", etc.).
- Weave in the provided keywords naturally — do not just list them.
- Reflect the customer's actual star rating honestly; never contradict it.
- Write the ENTIRE review in ${languageName} (${languageCode}), including any names, using natural, everyday phrasing a native speaker would use. Do not mix in English unless ${languageName} is English or a proper noun has no natural translation.
- Output ONLY the review text. No preamble, no quotation marks, no labels.`;

  const userLines = [
    `Business name: ${input.businessName}`,
    `Business category: ${input.category}`,
    `Customer's star rating: ${input.rating}/5`,
    `Things the customer liked: ${keywordList}`,
    `Requested tone: ${TONE_INSTRUCTIONS[input.tone]}`,
    toneForRating(input.rating),
  ];
  if (input.mentionDetail) {
    userLines.push(`Specifically mention: ${input.mentionDetail}`);
  }
  if (input.customerName) {
    userLines.push(`Customer's name (sign off with it only if it reads naturally): ${input.customerName}`);
  }
  if (input.occasion) {
    userLines.push(`Occasion for the visit: ${input.occasion}`);
  }
  userLines.push("", `Write the review now, entirely in ${languageName}.`);

  return {
    system,
    user: userLines.join("\n"),
  };
}
