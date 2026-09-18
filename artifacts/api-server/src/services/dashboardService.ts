import { and, count, desc, eq, gte, isNull, sql, sum, inArray } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  managedReviewsTable,
  reviewAuditEventsTable,
  reviewLocationsTable,
  reviewSessionsTable,
  scanEventsTable,
} from "@workspace/db";

async function countEvents(
  organizationId: string,
  eventTypes: Array<"QR_SCAN" | "GOOGLE_REDIRECT" | "REVIEW_GENERATED" | "CALL_CLICK" | "CONTACT_SAVED">,
  since?: Date,
): Promise<number> {
  const conditions = [
    eq(scanEventsTable.organizationId, organizationId),
    inArray(scanEventsTable.eventType, eventTypes),
    eq(scanEventsTable.redirectSuccess, true),
  ];
  if (since) conditions.push(gte(scanEventsTable.createdAt, since));
  const [row] = await db
    .select({ value: count() })
    .from(scanEventsTable)
    .where(and(...conditions));
  return row.value;
}

export async function getDashboardSummary(organizationId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    [totalRow],
    [activeRow],
    [activeCampaignsRow],
    recentBusinesses,
    qrScans,
    googleRedirects,
    scansToday,
    reviewsGenerated,
    calls,
    contactsSaved,
    [newReviewsRow],
    [reviewRepliesRow],
    topCampaignRows,
    recentEvents,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.organizationId, organizationId),
          isNull(businessesTable.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.organizationId, organizationId),
          isNull(businessesTable.deletedAt),
          isNull(businessesTable.archivedAt),
          eq(businessesTable.status, "ACTIVE"),
        ),
      ),
    db
      .select({ value: count() })
      .from(campaignsTable)
      .innerJoin(
        businessesTable,
        eq(campaignsTable.businessId, businessesTable.id),
      )
      .where(
        and(
          eq(businessesTable.organizationId, organizationId),
          isNull(businessesTable.deletedAt),
          isNull(campaignsTable.deletedAt),
          eq(campaignsTable.status, "ACTIVE"),
        ),
      ),
    db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.organizationId, organizationId),
          isNull(businessesTable.deletedAt),
        ),
      )
      .orderBy(desc(businessesTable.updatedAt))
      .limit(3),
    countEvents(organizationId, ["QR_SCAN"]),
    countEvents(organizationId, ["GOOGLE_REDIRECT"]),
    countEvents(organizationId, ["QR_SCAN"], startOfToday),
    countEvents(organizationId, ["REVIEW_GENERATED"]),
    countEvents(organizationId, ["CALL_CLICK"]),
    countEvents(organizationId, ["CONTACT_SAVED"]),
    db
      .select({ value: count() })
      .from(managedReviewsTable)
      .innerJoin(
        reviewLocationsTable,
        eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
      )
      .where(eq(managedReviewsTable.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(reviewAuditEventsTable)
      .where(
        and(
          eq(reviewAuditEventsTable.organizationId, organizationId),
          eq(reviewAuditEventsTable.eventType, "REPLY_PUBLISHED"),
        ),
      ),
    db
      .select({
        campaignId: scanEventsTable.campaignId,
        // Names are denormalized per event; group only by the stable id and
        // pick the latest-known name so renames don't split a campaign's rank.
        campaignName: sql<string>`coalesce(max(${scanEventsTable.campaignName}), 'Deleted campaign')`,
        businessName: sql<string>`coalesce(max(${scanEventsTable.businessName}), '')`,
        scans: count(),
      })
      .from(scanEventsTable)
      .where(
        and(
          eq(scanEventsTable.organizationId, organizationId),
          inArray(scanEventsTable.eventType, ["QR_SCAN"]),
          eq(scanEventsTable.redirectSuccess, true),
        ),
      )
      .groupBy(scanEventsTable.campaignId)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select()
      .from(scanEventsTable)
      .where(eq(scanEventsTable.organizationId, organizationId))
      .orderBy(desc(scanEventsTable.createdAt))
      .limit(5),
  ]);

  const businessActivity = recentBusinesses.map((business) => {
    const wasJustCreated =
      business.createdAt.getTime() === business.updatedAt.getTime();
    return {
      id: business.id,
      type: wasJustCreated ? "business_created" : "business_updated",
      message: wasJustCreated
        ? `${business.name} was added`
        : `${business.name} was updated`,
      createdAt: business.updatedAt,
    };
  });

  const eventActivity = recentEvents.map((event) => {
    const campaign = event.campaignName ?? "a campaign";
    const message =
      event.eventType === "QR_SCAN"
        ? `QR code scanned on ${campaign}`
      : event.eventType === "GOOGLE_REDIRECT"
        ? `Customer clicked through to Google from ${campaign}`
        : event.eventType === "REVIEW_GENERATED"
          ? `AI review draft generated for ${campaign}`
          : event.eventType === "CALL_CLICK"
            ? `Customer called from ${campaign}`
            : `Customer saved a contact from ${campaign}`;
    return {
      id: event.id,
      type: event.eventType.toLowerCase(),
      message,
      createdAt: event.createdAt,
    };
  });

  const recentActivity = [...eventActivity, ...businessActivity]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  return {
    totalBusinesses: totalRow.value,
    activeBusinesses: activeRow.value,
    activeCampaigns: activeCampaignsRow.value,
    qrScans,
    scansToday,
    googleRedirects,
    reviewsGenerated,
    newReviews: newReviewsRow?.value ?? 0,
    reviewReplies: reviewRepliesRow?.value ?? 0,
    calls,
    contactsSaved,
    needsOnboarding: totalRow.value === 0,
    topCampaigns: topCampaignRows.map((row) => ({
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      businessName: row.businessName,
      scans: row.scans,
    })),
    recentActivity,
  };
}
