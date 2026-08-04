import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, businessesTable, campaignsTable } from "@workspace/db";

/**
 * qrScans and aiReviewsGenerated remain hardcoded placeholders until QR scan
 * tracking and AI usage logging are built in a later sprint — there is
 * nothing real to count yet. activeCampaigns now reflects real Campaign rows.
 */
export async function getDashboardSummary(organizationId: string) {
  const [[totalRow], [activeRow], [activeCampaignsRow], recentBusinesses] =
    await Promise.all([
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
        .limit(5),
    ]);

  const recentActivity = recentBusinesses.map((business) => {
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

  return {
    totalBusinesses: totalRow.value,
    activeBusinesses: activeRow.value,
    activeCampaigns: activeCampaignsRow.value,
    qrScans: 0,
    aiReviewsGenerated: 0,
    needsOnboarding: totalRow.value === 0,
    recentActivity,
  };
}
