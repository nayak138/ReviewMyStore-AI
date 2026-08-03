import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";

/**
 * activeCampaigns, qrScans, and aiReviewsGenerated are hardcoded placeholders
 * until Campaigns, QR Codes, and AI Review Generation are built in later
 * sprints — those features do not exist yet, so there is nothing real to
 * count.
 */
export async function getDashboardSummary(organizationId: string) {
  const [[totalRow], [activeRow], recentBusinesses] = await Promise.all([
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
    activeCampaigns: 0,
    qrScans: 0,
    aiReviewsGenerated: 0,
    needsOnboarding: totalRow.value === 0,
    recentActivity,
  };
}
