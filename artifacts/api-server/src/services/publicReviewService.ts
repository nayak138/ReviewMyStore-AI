import { and, asc, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  keywordsTable,
  reviewSessionsTable,
} from "@workspace/db";
import { generateReviewText } from "./aiService";
import { logScanEvent, type RequestMeta } from "./scanEventService";

export class PublicCampaignNotFoundError extends Error {
  constructor(businessSlug: string, campaignSlug: string) {
    super(`No active campaign at ${businessSlug}/${campaignSlug}`);
    this.name = "PublicCampaignNotFoundError";
  }
}

export class RegenerationLimitReachedError extends Error {
  constructor(readonly maxGenerations: number) {
    super(`Regeneration limit of ${maxGenerations} reached for this session`);
    this.name = "RegenerationLimitReachedError";
  }
}

const MAX_GENERATIONS = 3;

/** Only ACTIVE, non-archived, non-deleted campaigns under a non-deleted
 * business are reachable — this is what keeps a DRAFT or paused campaign's
 * URL from working just because someone guesses the slugs. */
async function findActivePublicCampaign(
  businessSlug: string,
  campaignSlug: string,
) {
  const [row] = await db
    .select({ business: businessesTable, campaign: campaignsTable })
    .from(campaignsTable)
    .innerJoin(
      businessesTable,
      eq(campaignsTable.businessId, businessesTable.id),
    )
    .where(
      and(
        eq(businessesTable.slug, businessSlug),
        eq(campaignsTable.slug, campaignSlug),
        eq(campaignsTable.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!row) throw new PublicCampaignNotFoundError(businessSlug, campaignSlug);
  return row;
}

function buildGoogleReviewUrl(googlePlaceId: string | null): string | null {
  if (!googlePlaceId) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(googlePlaceId)}`;
}

export async function getPublicReviewPage(
  businessSlug: string,
  campaignSlug: string,
) {
  const { business, campaign } = await findActivePublicCampaign(
    businessSlug,
    campaignSlug,
  );

  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(
      and(
        eq(keywordsTable.campaignId, campaign.id),
        eq(keywordsTable.enabled, true),
      ),
    )
    .orderBy(asc(keywordsTable.sortOrder), asc(keywordsTable.createdAt));

  return {
    business: {
      name: business.name,
      category: business.category,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      brandColor: business.brandColor,
      welcomeMessage: business.welcomeMessage,
    },
    campaign: { id: campaign.id, name: campaign.name },
    keywords: keywords.map((k) => ({
      id: k.id,
      label: k.label,
      category: k.category,
    })),
    googleReviewUrl: buildGoogleReviewUrl(business.googlePlaceId),
  };
}

export async function generatePublicReview(
  businessSlug: string,
  campaignSlug: string,
  sessionId: string,
  keywords: string[],
) {
  const { business, campaign } = await findActivePublicCampaign(
    businessSlug,
    campaignSlug,
  );

  const [existingSession] = await db
    .select()
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId))
    .limit(1);

  const currentCount = existingSession?.generationCount ?? 0;
  if (currentCount >= MAX_GENERATIONS) {
    throw new RegenerationLimitReachedError(MAX_GENERATIONS);
  }

  const reviewText = await generateReviewText({
    businessName: business.name,
    category: business.category,
    keywords,
    organizationId: business.organizationId,
    businessId: business.id,
    campaignId: campaign.id,
  });

  const nextCount = currentCount + 1;
  if (existingSession) {
    await db
      .update(reviewSessionsTable)
      .set({
        generationCount: nextCount,
        lastReviewText: reviewText,
        updatedAt: new Date(),
      })
      .where(eq(reviewSessionsTable.id, sessionId));
  } else {
    await db.insert(reviewSessionsTable).values({
      id: sessionId,
      campaignId: campaign.id,
      generationCount: nextCount,
      lastReviewText: reviewText,
    });
  }

  return {
    reviewText,
    remainingGenerations: MAX_GENERATIONS - nextCount,
    maxGenerations: MAX_GENERATIONS,
  };
}

/** Logs the end of the funnel: a customer clicked "Copy & Post to Google".
 * Counted as GOOGLE_REDIRECT so the dashboard can show real click-throughs. */
export async function trackGoogleRedirect(
  businessSlug: string,
  campaignSlug: string,
  meta: RequestMeta,
): Promise<void> {
  const { business, campaign } = await findActivePublicCampaign(
    businessSlug,
    campaignSlug,
  );

  await logScanEvent({
    eventType: "GOOGLE_REDIRECT",
    organizationId: business.organizationId,
    businessId: business.id,
    businessName: business.name,
    campaignId: campaign.id,
    campaignName: campaign.name,
    redirectSuccess: true,
    meta,
  });
}
