import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  keywordsTable,
  organizationsTable,
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

export class SessionCampaignMismatchError extends Error {
  constructor() {
    super("This review session is not valid for this campaign");
    this.name = "SessionCampaignMismatchError";
  }
}

export class OrganizationQuotaExhaustedError extends Error {
  constructor() {
    super("AI generation quota exhausted");
    this.name = "OrganizationQuotaExhaustedError";
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
        isNull(campaignsTable.deletedAt),
        isNull(campaignsTable.archivedAt),
        eq(businessesTable.status, "ACTIVE"),
        isNull(businessesTable.deletedAt),
        isNull(businessesTable.archivedAt),
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

function publicAssetPath(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("/objects/")
    ? `/public-assets/${path.slice("/objects/".length)}`
    : path;
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
       logoUrl: publicAssetPath(business.logoUrl),
       coverImageUrl: publicAssetPath(business.coverImageUrl),
      brandColor: business.brandColor,
      welcomeMessage: business.welcomeMessage,
      address: business.address,
      phone: business.phone,
      website: business.website,
      instagramUrl: business.instagramUrl,
      facebookUrl: business.facebookUrl,
      whatsappNumber: business.whatsappNumber,
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

  const reservedGeneration = await db.transaction(async (tx) => {
    const [existingSession] = await tx
      .select()
      .from(reviewSessionsTable)
      .where(eq(reviewSessionsTable.id, sessionId))
      .limit(1);

    if (existingSession && existingSession.campaignId !== campaign.id) {
      throw new SessionCampaignMismatchError();
    }

    const [organization] = await tx
      .update(organizationsTable)
      .set({ aiQuota: sql`${organizationsTable.aiQuota} - 1` })
      .where(
        and(
          eq(organizationsTable.id, business.organizationId),
          sql`${organizationsTable.aiQuota} > 0`,
        ),
      )
      .returning({ aiQuota: organizationsTable.aiQuota });
    if (!organization) throw new OrganizationQuotaExhaustedError();

    if (existingSession) {
      const [updated] = await tx
        .update(reviewSessionsTable)
        .set({
          generationCount: sql`${reviewSessionsTable.generationCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reviewSessionsTable.id, sessionId),
            eq(reviewSessionsTable.campaignId, campaign.id),
            sql`${reviewSessionsTable.generationCount} < ${MAX_GENERATIONS}`,
          ),
        )
        .returning({ generationCount: reviewSessionsTable.generationCount });
      if (!updated) throw new RegenerationLimitReachedError(MAX_GENERATIONS);
      return updated.generationCount;
    }

    const [inserted] = await tx
      .insert(reviewSessionsTable)
      .values({ id: sessionId, campaignId: campaign.id, generationCount: 1 })
      .onConflictDoNothing()
      .returning({ generationCount: reviewSessionsTable.generationCount });
    if (inserted) return inserted.generationCount;

    const [updated] = await tx
      .update(reviewSessionsTable)
      .set({
        generationCount: sql`${reviewSessionsTable.generationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviewSessionsTable.id, sessionId),
          eq(reviewSessionsTable.campaignId, campaign.id),
          sql`${reviewSessionsTable.generationCount} < ${MAX_GENERATIONS}`,
        ),
      )
      .returning({ generationCount: reviewSessionsTable.generationCount });
    if (!updated) throw new RegenerationLimitReachedError(MAX_GENERATIONS);
    return updated.generationCount;
  });

  const reviewText = await generateReviewText({
    businessName: business.name,
    category: business.category,
    keywords,
    organizationId: business.organizationId,
    businessId: business.id,
    campaignId: campaign.id,
  });

  await db
    .update(reviewSessionsTable)
    .set({ lastReviewText: reviewText, updatedAt: new Date() })
    .where(
      and(
        eq(reviewSessionsTable.id, sessionId),
        eq(reviewSessionsTable.campaignId, campaign.id),
      ),
    );

  return {
    reviewText,
    remainingGenerations: MAX_GENERATIONS - reservedGeneration,
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
