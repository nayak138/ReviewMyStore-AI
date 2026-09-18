import { and, count, eq, gte, isNull, sql, sum } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  privateFeedbackTable,
  reviewSessionsTable,
  scanEventsTable,
} from "@workspace/db";
import { BusinessNotFoundError } from "./businessService";

type EventType = "QR_SCAN" | "NFC_TAP" | "GOOGLE_REDIRECT";
type FeedbackStatus = "NEW" | "VIEWED" | "RESOLVED";

const EVENT_TYPES: EventType[] = ["QR_SCAN", "NFC_TAP", "GOOGLE_REDIRECT"];
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

  const dayExpression = sql<string>`to_char(date_trunc('day', ${scanEventsTable.createdAt}), 'YYYY-MM-DD')`;

  const [
    eventTotals,
    dailyEvents,
    campaignRows,
    [campaignCount],
    [activeCampaignCount],
    [feedbackSummary],
    feedbackRatings,
    feedbackStatuses,
    [aiRow],
  ] = await Promise.all([
    db
      .select({ eventType: scanEventsTable.eventType, value: count() })
      .from(scanEventsTable)
      .where(and(...eventConditions))
      .groupBy(scanEventsTable.eventType),
    db
      .select({
        date: dayExpression,
        eventType: scanEventsTable.eventType,
        value: count(),
      })
      .from(scanEventsTable)
      .where(and(...eventConditions))
      .groupBy(dayExpression, scanEventsTable.eventType),
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
      .select({ value: sum(reviewSessionsTable.generationCount) })
      .from(reviewSessionsTable)
      .innerJoin(
        campaignsTable,
        eq(reviewSessionsTable.campaignId, campaignsTable.id),
      )
      .where(
        and(
          eq(campaignsTable.businessId, businessId),
          isNull(campaignsTable.deletedAt),
        ),
      ),
  ]);

  const totals: Record<EventType, number> = {
    QR_SCAN: 0,
    NFC_TAP: 0,
    GOOGLE_REDIRECT: 0,
  };
  for (const row of eventTotals) {
    if (row.eventType) totals[row.eventType] = row.value;
  }

  const dailyMap = new Map<
    string,
    { qrScans: number; nfcTaps: number; googleRedirects: number; privateFeedback: number }
  >();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(periodStart);
    date.setUTCDate(date.getUTCDate() + index);
    dailyMap.set(dateKey(date), {
      qrScans: 0,
      nfcTaps: 0,
      googleRedirects: 0,
      privateFeedback: 0,
    });
  }
  for (const row of dailyEvents) {
    const point = dailyMap.get(row.date);
    if (!point) continue;
    if (row.eventType === "QR_SCAN") point.qrScans = row.value;
    if (row.eventType === "NFC_TAP") point.nfcTaps = row.value;
    if (row.eventType === "GOOGLE_REDIRECT") point.googleRedirects = row.value;
  }

  const feedbackByDate = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${privateFeedbackTable.createdAt}), 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(privateFeedbackTable)
    .where(and(...feedbackConditions))
    .groupBy(sql`date_trunc('day', ${privateFeedbackTable.createdAt})`);
  for (const row of feedbackByDate) {
    const point = dailyMap.get(row.date);
    if (point) point.privateFeedback = row.value;
  }

  const campaignMap = new Map<
    string,
    {
      campaignId: string;
      campaignName: string;
      status: "DRAFT" | "ACTIVE" | "ARCHIVED" | "DISABLED";
      qrScans: number;
      nfcTaps: number;
      googleRedirects: number;
    }
  >();
  for (const row of campaignRows) {
    const existing = campaignMap.get(row.campaignId) ?? {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      status: row.status,
      qrScans: 0,
      nfcTaps: 0,
      googleRedirects: 0,
    };
    if (row.eventType === "QR_SCAN") existing.qrScans = row.value;
    if (row.eventType === "NFC_TAP") existing.nfcTaps = row.value;
    if (row.eventType === "GOOGLE_REDIRECT") existing.googleRedirects = row.value;
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
      nfcTaps: totals.NFC_TAP,
      googleRedirects: totals.GOOGLE_REDIRECT,
      totalActions: totals.QR_SCAN + totals.NFC_TAP,
      activeCampaigns: activeCampaignCount?.value ?? 0,
      totalCampaigns: campaignCount?.value ?? 0,
      privateFeedback: feedbackCount,
      averageFeedbackRating: Number(averageFeedbackRating.toFixed(1)),
      newFeedback,
      resolvedFeedback,
      aiReviewsGenerated: Number(aiRow?.value ?? 0),
      scanToGoogleRate,
    },
    dailyTrend: [...dailyMap.entries()].map(([date, point]) => ({ date, ...point })),
    campaignPerformance: [...campaignMap.values()]
      .map((campaign) => ({
        ...campaign,
        totalActions:
          campaign.qrScans + campaign.nfcTaps + campaign.googleRedirects,
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