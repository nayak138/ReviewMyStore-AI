import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  keywordsTable,
  organizationsTable,
  reviewGenerationReservationsTable,
  reviewSessionsTable,
} from "@workspace/db";
import { generateReviewText } from "./aiService";
import { logger } from "../lib/logger";
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
const PENDING_RESERVATION = "PENDING" as const;
const SUCCEEDED_RESERVATION = "SUCCEEDED" as const;
const FAILED_RESERVATION = "FAILED" as const;

/** Completed reservation rows are retained for 30 days for operational
 * auditing, then removed by the bounded cleanup job. Pending rows are never
 * eligible for retention cleanup. */
export const COMPLETED_RESERVATION_RETENTION_DAYS = 30;
export const COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE = 500;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export async function countStaleCompletedGenerationReservations(
  options: { now?: Date } = {},
): Promise<number> {
  const { now = new Date() } = options;
  const cutoff = new Date(
    now.getTime() - COMPLETED_RESERVATION_RETENTION_DAYS * MILLISECONDS_PER_DAY,
  );

  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM ${reviewGenerationReservationsTable}
    WHERE ${reviewGenerationReservationsTable.status} IN (
      ${SUCCEEDED_RESERVATION},
      ${FAILED_RESERVATION}
    )
      AND ${reviewGenerationReservationsTable.updatedAt} < ${cutoff}
  `);

  return Number(result.rows[0]?.count ?? 0);
}

export async function cleanupCompletedGenerationReservations(
  options: {
    now?: Date;
    batchSize?: number;
  } = {},
): Promise<number> {
  const {
    now = new Date(),
    batchSize = COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
  } = options;

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new RangeError(
      "Reservation cleanup batch size must be a positive integer",
    );
  }

  const boundedBatchSize = Math.min(
    batchSize,
    COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
  );
  const cutoff = new Date(
    now.getTime() - COMPLETED_RESERVATION_RETENTION_DAYS * MILLISECONDS_PER_DAY,
  );

  const deleted = await db.execute(sql`
    WITH stale_reservations AS (
      SELECT ${reviewGenerationReservationsTable.id} AS id
      FROM ${reviewGenerationReservationsTable}
      WHERE ${reviewGenerationReservationsTable.status} IN (
        ${SUCCEEDED_RESERVATION},
        ${FAILED_RESERVATION}
      )
        AND ${reviewGenerationReservationsTable.updatedAt} < ${cutoff}
      ORDER BY ${reviewGenerationReservationsTable.updatedAt} ASC
      LIMIT ${boundedBatchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM ${reviewGenerationReservationsTable}
    WHERE ${reviewGenerationReservationsTable.id} IN (
      SELECT id FROM stale_reservations
    )
    RETURNING ${reviewGenerationReservationsTable.id}
  `);

  return deleted.rows.length;
}

/** Only ACTIVE, non-archived, non-deleted campaigns under a non-deleted
 * business are reachable — this is what keeps a DRAFT or paused campaign's
 * URL from working just because someone guesses the slugs. */
export async function findActivePublicCampaign(
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
      googleRating: business.googleRating,
      googleReviewCount: business.googleReviewCount,
      // Prefer the cached Google Places photo (fetched via the official API
      // at onboarding/edit time); fall back to the owner's own cover image
      // so the header always has something to show.
      headerImageUrl: business.placeImageUrl ?? publicAssetPath(business.coverImageUrl),
      googleVerified: Boolean(business.googlePlaceId),
      defaultLanguage: business.defaultLanguage,
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

export interface GeneratePublicReviewOptions {
  rating: number;
  tone: "ENTHUSIASTIC" | "SHORT_DIRECT" | "DETAILED" | "WARM";
  language?: string;
  mentionDetail?: string | null;
  customerName?: string | null;
  occasion?: string | null;
}

export async function generatePublicReview(
  businessSlug: string,
  campaignSlug: string,
  sessionId: string,
  keywords: string[],
  options: GeneratePublicReviewOptions,
) {
  const { business, campaign } = await findActivePublicCampaign(
    businessSlug,
    campaignSlug,
  );
  const language = options.language ?? business.defaultLanguage ?? "en";

  const reservationId = randomUUID();
  await db.transaction(async (tx) => {
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

    let generationCount: number;
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
      generationCount = updated.generationCount;
    } else {
      const [inserted] = await tx
        .insert(reviewSessionsTable)
        .values({ id: sessionId, campaignId: campaign.id, generationCount: 1 })
        .onConflictDoNothing()
        .returning({ generationCount: reviewSessionsTable.generationCount });

      if (inserted) {
        generationCount = inserted.generationCount;
      } else {
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
        generationCount = updated.generationCount;
      }
    }

    await tx.insert(reviewGenerationReservationsTable).values({
      id: reservationId,
      sessionId,
      campaignId: campaign.id,
      organizationId: business.organizationId,
      status: PENDING_RESERVATION,
    });

    return generationCount;
  });

  try {
    const reviewText = await generateReviewText({
      businessName: business.name,
      category: business.category,
      keywords,
      rating: options.rating,
      tone: options.tone,
      language,
      mentionDetail: options.mentionDetail,
      customerName: options.customerName,
      occasion: options.occasion,
      organizationId: business.organizationId,
      businessId: business.id,
      campaignId: campaign.id,
    });

    const finalizedGenerationCount = await db.transaction(async (tx) => {
      const [updatedSession] = await tx
        .update(reviewSessionsTable)
        .set({ lastReviewText: reviewText, updatedAt: new Date() })
        .where(
          and(
            eq(reviewSessionsTable.id, sessionId),
            eq(reviewSessionsTable.campaignId, campaign.id),
          ),
        )
        .returning({ generationCount: reviewSessionsTable.generationCount });

      if (!updatedSession) {
        throw new Error("Review session no longer exists");
      }

      const [finalizedReservation] = await tx
        .update(reviewGenerationReservationsTable)
        .set({
          status: SUCCEEDED_RESERVATION,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reviewGenerationReservationsTable.id, reservationId),
            eq(reviewGenerationReservationsTable.status, PENDING_RESERVATION),
          ),
        )
        .returning({ id: reviewGenerationReservationsTable.id });

      if (!finalizedReservation) {
        throw new Error("Review generation reservation is no longer pending");
      }

      return updatedSession.generationCount;
    });

    return {
      reviewText,
      remainingGenerations: Math.max(
        0,
        MAX_GENERATIONS - finalizedGenerationCount,
      ),
      maxGenerations: MAX_GENERATIONS,
      language,
    };
  } catch (error) {
    try {
      await releaseGenerationReservation(reservationId);
    } catch (releaseError) {
      logger.error(
        { reservationId, err: releaseError },
        "Failed to release public review generation reservation",
      );
    }
    throw error;
  }
}

async function releaseGenerationReservation(
  reservationId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [reservation] = await tx
      .update(reviewGenerationReservationsTable)
      .set({
        status: FAILED_RESERVATION,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviewGenerationReservationsTable.id, reservationId),
          eq(reviewGenerationReservationsTable.status, PENDING_RESERVATION),
        ),
      )
      .returning({
        sessionId: reviewGenerationReservationsTable.sessionId,
        organizationId: reviewGenerationReservationsTable.organizationId,
        campaignId: reviewGenerationReservationsTable.campaignId,
      });

    if (!reservation) return;

    await tx
      .update(reviewSessionsTable)
      .set({
        generationCount: sql`GREATEST(${reviewSessionsTable.generationCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviewSessionsTable.id, reservation.sessionId),
          eq(reviewSessionsTable.campaignId, reservation.campaignId),
          sql`${reviewSessionsTable.generationCount} > 0`,
        ),
      );

    await tx
      .update(organizationsTable)
      .set({
        aiQuota: sql`GREATEST(${organizationsTable.aiQuota} + 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(organizationsTable.id, reservation.organizationId));
  });
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
