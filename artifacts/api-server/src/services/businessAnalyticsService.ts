import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  managedReviewsTable,
  privateFeedbackTable,
  reviewAuditEventsTable,
  reviewLocationsTable,
  scanEventsTable,
} from "@workspace/db";
import { BusinessNotFoundError } from "./businessService";

type EventType =
  | "QR_SCAN"
  | "GOOGLE_REDIRECT"
  | "REVIEW_GENERATED"
  | "CALL_CLICK"
  | "CONTACT_SAVED";
type FeedbackStatus = "NEW" | "VIEWED" | "RESOLVED";

const EVENT_TYPES: EventType[] = [
  "QR_SCAN",
  "GOOGLE_REDIRECT",
  "REVIEW_GENERATED",
  "CALL_CLICK",
  "CONTACT_SAVED",
];
const FEEDBACK_STATUSES: FeedbackStatus[] = ["NEW", "VIEWED", "RESOLVED"];

function periodStartFor(days: number, periodEnd: Date): Date {
  const start = new Date(
    Date.UTC(
      periodEnd.getUTCFullYear(),
      periodEnd.getUTCMonth(),
      periodEnd.getUTCDate(),
    ),
  );
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getBusinessAnalytics(
  organizationId: string,
  businessId: string,
  days: number,
) {
  const periodEnd = new Date();
  const periodStart = periodStartFor(days, periodEnd);
  const [business] = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, organizationId),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);

  if (!business) throw new BusinessNotFoundError(businessId);

  const eventConditions = [
    eq(scanEventsTable.organizationId, organizationId),
    eq(scanEventsTable.businessId, businessId),
    eq(scanEventsTable.redirectSuccess, true),
    gte(scanEventsTable.createdAt, periodStart),
  ];
  const feedbackConditions = [
    eq(privateFeedbackTable.organizationId, organizationId),
    eq(privateFeedbackTable.businessId, businessId),
    gte(privateFeedbackTable.createdAt, periodStart),
  ];
  const reviewConditions = [
    eq(managedReviewsTable.organizationId, organizationId),
    eq(reviewLocationsTable.businessId, businessId),
    gte(managedReviewsTable.createdAt, periodStart),
  ];
  const replyConditions = [
    eq(reviewAuditEventsTable.organizationId, organizationId),
    eq(reviewLocationsTable.businessId, businessId),
    eq(reviewAuditEventsTable.eventType, "REPLY_PUBLISHED"),
    gte(reviewAuditEventsTable.createdAt, periodStart),
  ];

  const eventDayExpression = sql<string>`to_char(date_trunc('day', ${scanEventsTable.createdAt}), 'YYYY-MM-DD')`;
  const reviewDayExpression = sql<string>`to_char(date_trunc('day', ${managedReviewsTable.createdAt}), 'YYYY-MM-DD')`;
  const replyDayExpression = sql<string>`to_char(date_trunc('day', ${reviewAuditEventsTable.createdAt}), 'YYYY-MM-DD')`;

  const [
    eventTotals,
    dailyEvents,
    campaignRows,
    [campaignCount],
    [activeCampaignCount],
    [feedbackSummary],
    feedbackRatings,
    feedbackStatuses,
    [newReviewsRow],
    [repliesRow],
    newReviewsByDate,
    repliesByDate,
  ] = await Promise.all([
    db
      .select({ eventType: scanEventsTable.eventType, value: count() })
      .from(scanEventsTable)
      .where(and(...eventConditions))
      .groupBy(scanEventsTable.eventType),
    db
      .select({
        date: eventDayExpression,
        eventType: scanEventsTable.eventType,
        value: count(),
      })
      .from(scanEventsTable)
      .where(and(...eventConditions))
      .groupBy(eventDayExpression, scanEventsTable.eventType),
    db
      .select({
        campaignId: campaignsTable.id,
        campaignName: campaignsTable.name,
        status: campaignsTable.status,
        eventType: scanEventsTable.eventType,
        value: count(),
      })
      .from(campaignsTable)
      .leftJoin(
        scanEventsTable,
        and(
          eq(scanEventsTable.campaignId, campaignsTable.id),
          eq(scanEventsTable.organizationId, organizationId),
          eq(scanEventsTable.businessId, businessId),
          eq(scanEventsTable.redirectSuccess, true),
          gte(scanEventsTable.createdAt, periodStart),
        ),
      )
      .where(
        and(
          eq(campaignsTable.businessId, businessId),
          isNull(campaignsTable.deletedAt),
        ),
      )
      .groupBy(
        campaignsTable.id,
        campaignsTable.name,
        campaignsTable.status,
        scanEventsTable.eventType,
      ),
    db
      .select({ value: count() })
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.businessId, businessId),
          isNull(campaignsTable.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.businessId, businessId),
          isNull(campaignsTable.deletedAt),
          eq(campaignsTable.status, "ACTIVE"),
        ),
      ),
    db
      .select({
        count: count(),
        average: sql<number>`coalesce(avg(${privateFeedbackTable.rating}), 0)`,
      })
      .from(privateFeedbackTable)
      .where(and(...feedbackConditions)),
    db
      .select({
        rating: privateFeedbackTable.rating,
        value: count(),
      })
      .from(privateFeedbackTable)
      .where(and(...feedbackConditions))
      .groupBy(privateFeedbackTable.rating)
      .orderBy(privateFeedbackTable.rating),
    db
      .select({
        status: privateFeedbackTable.status,
        value: count(),
      })
      .from(privateFeedbackTable)
      .where(and(...feedbackConditions))
      .groupBy(privateFeedbackTable.status),
    db
      .select({ value: count() })
      .from(managedReviewsTable)
      .innerJoin(
        reviewLocationsTable,
        eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
      )
      .where(and(...reviewConditions)),
    db
      .select({ value: count() })
      .from(reviewAuditEventsTable)
      .innerJoin(
        managedReviewsTable,
        eq(reviewAuditEventsTable.managedReviewId, managedReviewsTable.id),
      )
      .innerJoin(
        reviewLocationsTable,
        eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
      )
      .where(and(...replyConditions)),
    db
      .select({ date: reviewDayExpression, value: count() })
      .from(managedReviewsTable)
      .innerJoin(
        reviewLocationsTable,
        eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
      )
      .where(and(...reviewConditions))
      .groupBy(reviewDayExpression),
    db
      .select({ date: replyDayExpression, value: count() })
      .from(reviewAuditEventsTable)
      .innerJoin(
        managedReviewsTable,
        eq(reviewAuditEventsTable.managedReviewId, managedReviewsTable.id),
      )
      .innerJoin(
        reviewLocationsTable,
        eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
      )
      .where(and(...replyConditions))
      .groupBy(replyDayExpression),
  ]);

  const totals: Record<EventType, number> = {
    QR_SCAN: 0,
    GOOGLE_REDIRECT: 0,
    REVIEW_GENERATED: 0,
    CALL_CLICK: 0,
    CONTACT_SAVED: 0,
  };
  for (const row of eventTotals) {
    if (row.eventType && EVENT_TYPES.includes(row.eventType as EventType)) {
      totals[row.eventType as EventType] = row.value;
    }
  }

  const dailyMap = new Map<
    string,
    {
      qrScans: number;
      googleRedirects: number;
      reviewsGenerated: number;
      newReviews: number;
      reviewReplies: number;
      calls: number;
      contactsSaved: number;
      privateFeedback: number;
    }
  >();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(periodStart);
    date.setUTCDate(date.getUTCDate() + index);
    dailyMap.set(dateKey(date), {
      qrScans: 0,
      googleRedirects: 0,
      reviewsGenerated: 0,
      newReviews: 0,
      reviewReplies: 0,
      calls: 0,
      contactsSaved: 0,
      privateFeedback: 0,
    });
  }
  for (const row of dailyEvents) {
    const point = dailyMap.get(row.date);
    if (!point) continue;
    if (row.eventType === "QR_SCAN") point.qrScans = row.value;
    if (row.eventType === "GOOGLE_REDIRECT") point.googleRedirects = row.value;
    if (row.eventType === "REVIEW_GENERATED") point.reviewsGenerated = row.value;
    if (row.eventType === "CALL_CLICK") point.calls = row.value;
    if (row.eventType === "CONTACT_SAVED") point.contactsSaved = row.value;
  }
  for (const row of newReviewsByDate) {
    dailyMap.get(row.date)!.newReviews = row.value;
  }
  for (const row of repliesByDate) {
    dailyMap.get(row.date)!.reviewReplies = row.value;
  }

  const campaignMap = new Map<
    string,
    {
      campaignId: string;
      campaignName: string;
      status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "DISABLED";
      qrScans: number;
      googleRedirects: number;
      reviewsGenerated: number;
      calls: number;
      contactsSaved: number;
    }
  >();
  for (const row of campaignRows) {
    const existing = campaignMap.get(row.campaignId) ?? {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      status: row.status,
      qrScans: 0,
      googleRedirects: 0,
      reviewsGenerated: 0,
      calls: 0,
      contactsSaved: 0,
    };
    if (row.eventType === "QR_SCAN") existing.qrScans = row.value;
    if (row.eventType === "GOOGLE_REDIRECT") existing.googleRedirects = row.value;
    if (row.eventType === "REVIEW_GENERATED") existing.reviewsGenerated = row.value;
    if (row.eventType === "CALL_CLICK") existing.calls = row.value;
    if (row.eventType === "CONTACT_SAVED") existing.contactsSaved = row.value;
    campaignMap.set(row.campaignId, existing);
  }

  const feedbackCount = feedbackSummary?.count ?? 0;
  const averageFeedbackRating = Number(feedbackSummary?.average ?? 0);
  const newFeedback =
    feedbackStatuses.find((row) => row.status === "NEW")?.value ?? 0;
  const resolvedFeedback =
    feedbackStatuses.find((row) => row.status === "RESOLVED")?.value ?? 0;
  const scanToGoogleRate = totals.QR_SCAN
    ? Number(((totals.GOOGLE_REDIRECT / totals.QR_SCAN) * 100).toFixed(1))
    : 0;

  return {
    businessId: business.id,
    businessName: business.name,
    periodStart,
    periodEnd,
    summary: {
      qrScans: totals.QR_SCAN,
      googleRedirects: totals.GOOGLE_REDIRECT,
      reviewsGenerated: totals.REVIEW_GENERATED,
      newReviews: newReviewsRow?.value ?? 0,
      reviewReplies: repliesRow?.value ?? 0,
      calls: totals.CALL_CLICK,
      contactsSaved: totals.CONTACT_SAVED,
      totalActions:
        totals.QR_SCAN +
        totals.GOOGLE_REDIRECT +
        totals.REVIEW_GENERATED +
        totals.CALL_CLICK +
        totals.CONTACT_SAVED,
      activeCampaigns: activeCampaignCount?.value ?? 0,
      totalCampaigns: campaignCount?.value ?? 0,
      privateFeedback: feedbackCount,
      averageFeedbackRating: Number(averageFeedbackRating.toFixed(1)),
      newFeedback,
      resolvedFeedback,
      scanToGoogleRate,
    },
    dailyTrend: [...dailyMap.entries()].map(([date, point]) => ({
      date,
      ...point,
    })),
    campaignPerformance: [...campaignMap.values()]
      .map((campaign) => ({
        ...campaign,
        totalActions:
          campaign.qrScans +
          campaign.googleRedirects +
          campaign.reviewsGenerated +
          campaign.calls +
          campaign.contactsSaved,
      }))
      .sort((a, b) => b.totalActions - a.totalActions),
    feedbackByRating: feedbackRatings.map((row) => ({
      rating: row.rating,
      count: row.value,
    })),
    feedbackByStatus: FEEDBACK_STATUSES.map((status) => ({
      status,
      count: feedbackStatuses.find((row) => row.status === status)?.value ?? 0,
    })),
  };
}