import { and, eq, isNull } from "drizzle-orm";
import {
  businessesTable,
  businessMembershipsTable,
  campaignsTable,
  keywordsTable,
  managedReviewsTable,
  privateFeedbackTable,
  reviewLocationsTable,
  socialMediaAccountsTable,
  type User,
} from "@workspace/db";
import { db } from "@workspace/db";

export type BusinessFeature =
  | "campaigns"
  | "reviewInbox"
  | "feedback"
  | "socialMedia"
  | "analytics";
export type BusinessAccessLevel = "VIEW" | "MANAGE";

export class BusinessAccessDeniedError extends Error {
  constructor(message = "You do not have access to this business.") {
    super(message);
    this.name = "BusinessAccessDeniedError";
  }
}

export class BusinessResourceNotFoundError extends Error {
  constructor() {
    super("The requested business resource was not found.");
    this.name = "BusinessResourceNotFoundError";
  }
}

const permissionColumn = {
  campaigns: businessMembershipsTable.campaignsPermission,
  reviewInbox: businessMembershipsTable.reviewInboxPermission,
  feedback: businessMembershipsTable.feedbackPermission,
  socialMedia: businessMembershipsTable.socialMediaPermission,
  analytics: businessMembershipsTable.analyticsPermission,
} as const;

function hasPermission(
  value: "NONE" | "VIEW" | "MANAGE" | null,
  level: BusinessAccessLevel,
) {
  return value === "MANAGE" || (level === "VIEW" && value === "VIEW");
}

export async function requireOwner(user: User): Promise<string> {
  if (user.role !== "OWNER" || !user.organizationId) {
    throw new BusinessAccessDeniedError(
      "Only an agency owner can perform this operation.",
    );
  }
  return user.organizationId;
}

/**
 * Resolve the business server-side and enforce deny-by-default access.
 * Owners receive full access only inside their organization. Team members
 * require an active membership and an explicit feature grant.
 */
export async function requireBusinessAccess(
  user: User,
  businessId: string,
  feature?: BusinessFeature,
  level: BusinessAccessLevel = "VIEW",
) {
  const organizationId = user.organizationId;
  if (!organizationId || user.role === "SUPER_ADMIN") {
    throw new BusinessAccessDeniedError();
  }
  if (user.role === "OWNER") {
    const [business] = await db
      .select({
        id: businessesTable.id,
        organizationId: businessesTable.organizationId,
        status: businessesTable.status,
        archivedAt: businessesTable.archivedAt,
        deletedAt: businessesTable.deletedAt,
      })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, businessId),
          eq(businessesTable.organizationId, organizationId),
          isNull(businessesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!business) throw new BusinessResourceNotFoundError();
    return business;
  }
  const [business] = await db
    .select({
      id: businessesTable.id,
      organizationId: businessesTable.organizationId,
      status: businessesTable.status,
      archivedAt: businessesTable.archivedAt,
      deletedAt: businessesTable.deletedAt,
      permission: feature
        ? permissionColumn[feature]
        : businessMembershipsTable.campaignsPermission,
    })
    .from(businessesTable)
    .leftJoin(
      businessMembershipsTable,
      and(
        eq(businessMembershipsTable.businessId, businessesTable.id),
        eq(businessMembershipsTable.userId, user.id),
        eq(businessMembershipsTable.organizationId, organizationId),
        isNull(businessMembershipsTable.removedAt),
      ),
    )
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, organizationId),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);

  if (
    !business ||
    (user.role === "TEAM_MEMBER" &&
      (business.archivedAt !== null ||
        business.status !== "ACTIVE" ||
        (feature !== undefined && !hasPermission(business.permission, level))))
  ) {
    throw new BusinessAccessDeniedError();
  }
  return business;
}

export async function listAccessibleBusinesses(
  user: User,
  includeArchived: boolean,
) {
  if (user.role === "OWNER" && user.organizationId) {
    const conditions = [
      eq(businessesTable.organizationId, user.organizationId),
      isNull(businessesTable.deletedAt),
    ];
    if (!includeArchived) conditions.push(isNull(businessesTable.archivedAt));
    return db
      .select()
      .from(businessesTable)
      .where(and(...conditions))
      .orderBy(businessesTable.createdAt);
  }
  if (user.role !== "TEAM_MEMBER" || !user.organizationId) return [];
  return db
    .select({ business: businessesTable })
    .from(businessMembershipsTable)
    .innerJoin(
      businessesTable,
      and(
        eq(businessMembershipsTable.businessId, businessesTable.id),
        eq(businessesTable.organizationId, user.organizationId),
      ),
    )
    .where(
      and(
        eq(businessMembershipsTable.userId, user.id),
        eq(businessMembershipsTable.organizationId, user.organizationId),
        isNull(businessMembershipsTable.removedAt),
        isNull(businessesTable.deletedAt),
        eq(businessesTable.status, "ACTIVE"),
        isNull(businessesTable.archivedAt),
      ),
    )
    .then((rows) => rows.map((row) => row.business));
}

async function resourceBusiness(
  user: User,
  businessId: string | undefined,
  feature: BusinessFeature,
  level: BusinessAccessLevel,
) {
  if (!businessId) throw new BusinessResourceNotFoundError();
  return requireBusinessAccess(user, businessId, feature, level);
}

export async function requireCampaignAccess(
  user: User,
  campaignId: string,
  level: BusinessAccessLevel,
) {
  const [row] = await db
    .select({ businessId: campaignsTable.businessId })
    .from(campaignsTable)
    .innerJoin(
      businessesTable,
      eq(businessesTable.id, campaignsTable.businessId),
    )
    .where(
      and(
        eq(campaignsTable.id, campaignId),
        eq(businessesTable.organizationId, user.organizationId ?? ""),
        isNull(campaignsTable.deletedAt),
      ),
    )
    .limit(1);
  return resourceBusiness(user, row?.businessId ?? undefined, "campaigns", level);
}

export async function requireKeywordAccess(
  user: User,
  keywordId: string,
  level: BusinessAccessLevel,
) {
  const [row] = await db
    .select({ businessId: campaignsTable.businessId })
    .from(keywordsTable)
    .innerJoin(campaignsTable, eq(campaignsTable.id, keywordsTable.campaignId))
    .innerJoin(
      businessesTable,
      eq(businessesTable.id, campaignsTable.businessId),
    )
    .where(
      and(
        eq(keywordsTable.id, keywordId),
        eq(businessesTable.organizationId, user.organizationId ?? ""),
      ),
    )
    .limit(1);
  return resourceBusiness(user, row?.businessId ?? undefined, "campaigns", level);
}

export async function requireReviewAccess(
  user: User,
  reviewId: string,
  level: BusinessAccessLevel,
) {
  const [row] = await db
    .select({ businessId: reviewLocationsTable.businessId })
    .from(managedReviewsTable)
    .innerJoin(
      reviewLocationsTable,
      eq(reviewLocationsTable.id, managedReviewsTable.reviewLocationId),
    )
    .where(
      and(
        eq(managedReviewsTable.id, reviewId),
        eq(managedReviewsTable.organizationId, user.organizationId ?? ""),
      ),
    )
    .limit(1);
  if (!row) throw new BusinessResourceNotFoundError();
  if (!row.businessId && user.role === "OWNER") return row;
  return resourceBusiness(user, row.businessId ?? undefined, "reviewInbox", level);
}

export async function requireFeedbackAccess(
  user: User,
  feedbackId: string,
  level: BusinessAccessLevel,
) {
  const [row] = await db
    .select({ businessId: privateFeedbackTable.businessId })
    .from(privateFeedbackTable)
    .where(
      and(
        eq(privateFeedbackTable.id, feedbackId),
        eq(privateFeedbackTable.organizationId, user.organizationId ?? ""),
      ),
    )
    .limit(1);
  return resourceBusiness(user, row?.businessId ?? undefined, "feedback", level);
}

export async function requireSocialAccountAccess(
  user: User,
  accountId: string,
) {
  const [row] = await db
    .select({ businessId: socialMediaAccountsTable.businessId })
    .from(socialMediaAccountsTable)
    .where(
      and(
        eq(socialMediaAccountsTable.id, accountId),
        eq(
          socialMediaAccountsTable.organizationId,
          user.organizationId ?? "",
        ),
      ),
    )
    .limit(1);
  return resourceBusiness(user, row?.businessId ?? undefined, "socialMedia", "VIEW");
}