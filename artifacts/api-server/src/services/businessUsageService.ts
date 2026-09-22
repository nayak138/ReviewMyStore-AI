import { and, eq, gt, or, sql } from "drizzle-orm";
import {
  businessUsagePeriodsTable,
  businessUsageReservationsTable,
  businessesTable,
  db,
  type BusinessUsageMetric,
} from "@workspace/db";
import type { PgTransaction } from "drizzle-orm/pg-core";

type UsageWindow = "DAILY" | "MONTHLY";

type UsageMetricConfig = {
  label: string;
  limit: number;
  window: UsageWindow;
};

type UsageTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0] extends PgTransaction<any, any, any>
  ? Parameters<Parameters<typeof db.transaction>[0]>[0]
  : never;

/**
 * These are app-level business allowances. Provider limits remain an
 * independent upstream constraint, so changing a connected Page/location
 * cannot create fresh allowance for the same business.
 */
export const BUSINESS_USAGE_CONFIG: Record<
  BusinessUsageMetric,
  UsageMetricConfig
> = {
  GOOGLE_REVIEW_IMPORTS: {
    label: "Google review imports",
    limit: 200,
    window: "MONTHLY",
  },
  AI_REVIEW_REPLIES: {
    label: "AI Google review replies",
    limit: 100,
    window: "MONTHLY",
  },
  PUBLIC_AI_GENERATIONS: {
    label: "AI review generations",
    limit: 50,
    window: "MONTHLY",
  },
  SOCIAL_POSTS: {
    label: "Social posts",
    limit: 50,
    window: "DAILY",
  },
  SOCIAL_COMMENT_IMPORTS: {
    label: "Social comment imports",
    limit: 5_000,
    window: "MONTHLY",
  },
  SOCIAL_COMMENT_REPLIES: {
    label: "Social comment replies",
    limit: 50,
    window: "DAILY",
  },
};

const METRICS = Object.keys(BUSINESS_USAGE_CONFIG) as BusinessUsageMetric[];

export class BusinessUsageLimitError extends Error {
  readonly status = 429;
  readonly code = "BUSINESS_USAGE_LIMIT_REACHED";

  constructor(
    readonly metric: BusinessUsageMetric,
    readonly limit: number,
    readonly used: number,
    readonly requested: number,
    readonly periodEnd: Date,
  ) {
    const config = BUSINESS_USAGE_CONFIG[metric];
    super(
      `${config.label} limit reached for this business. The allowance resets on ${periodEnd.toISOString()}.`,
    );
    this.name = "BusinessUsageLimitError";
  }
}

export type BusinessUsageReservation = {
  id: string;
  metric: BusinessUsageMetric;
  amount: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
};

export type BusinessUsageSummaryItem = {
  metric: BusinessUsageMetric;
  label: string;
  window: UsageWindow;
  used: number;
  reserved: number;
  limit: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
};

function periodFor(metric: BusinessUsageMetric, now: Date) {
  const config = BUSINESS_USAGE_CONFIG[metric];
  const start = new Date(now);
  if (config.window === "DAILY") {
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  const end = new Date(start);
  if (config.window === "DAILY") {
    end.setUTCDate(end.getUTCDate() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return { start, end };
}

async function ensurePeriod(
  tx: UsageTransaction,
  organizationId: string,
  businessId: string,
  metric: BusinessUsageMetric,
  now: Date,
) {
  const config = BUSINESS_USAGE_CONFIG[metric];
  const period = periodFor(metric, now);
  const [row] = await tx
    .insert(businessUsagePeriodsTable)
    .values({
      organizationId,
      businessId,
      metric,
      periodStart: period.start,
      periodEnd: period.end,
      limit: config.limit,
    })
    .onConflictDoNothing({
      target: [
        businessUsagePeriodsTable.businessId,
        businessUsagePeriodsTable.metric,
        businessUsagePeriodsTable.periodStart,
      ],
    })
    .returning();

  if (row) return row;
  const [existing] = await tx
    .select()
    .from(businessUsagePeriodsTable)
    .where(
      and(
        eq(businessUsagePeriodsTable.businessId, businessId),
        eq(businessUsagePeriodsTable.metric, metric),
        eq(businessUsagePeriodsTable.periodStart, period.start),
      ),
    )
    .limit(1);
  if (!existing) {
    throw new Error("Could not initialize the business usage period.");
  }
  return existing;
}

/**
 * Reserve before calling a provider. The guarded UPDATE is the concurrency
 * boundary: two requests cannot spend the same last unit.
 */
export async function reserveBusinessUsage(input: {
  organizationId: string;
  businessId: string;
  metric: BusinessUsageMetric;
  amount?: number;
  now?: Date;
}): Promise<BusinessUsageReservation> {
  const amount = input.amount ?? 1;
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Business usage reservation amount must be a positive integer.");
  }
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const period = await ensurePeriod(
      tx,
      input.organizationId,
      input.businessId,
      input.metric,
      now,
    );
    const [updated] = await tx
      .update(businessUsagePeriodsTable)
      .set({
        reserved: sql`${businessUsagePeriodsTable.reserved} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessUsagePeriodsTable.id, period.id),
          sql`${businessUsagePeriodsTable.used} + ${businessUsagePeriodsTable.reserved} + ${amount} <= ${businessUsagePeriodsTable.limit}`,
        ),
      )
      .returning();

    if (!updated) {
      throw new BusinessUsageLimitError(
        input.metric,
        period.limit,
        period.used + period.reserved,
        amount,
        period.periodEnd,
      );
    }

    const [reservation] = await tx
      .insert(businessUsageReservationsTable)
      .values({
        organizationId: input.organizationId,
        businessId: input.businessId,
        metric: input.metric,
        periodStart: period.periodStart,
        amount,
      })
      .returning();
    if (!reservation) throw new Error("Could not create usage reservation.");

    return {
      id: reservation.id,
      metric: input.metric,
      amount,
      remaining: updated.limit - updated.used - updated.reserved,
      periodStart: updated.periodStart,
      periodEnd: updated.periodEnd,
    };
  });
}

async function settleReservation(
  reservationId: string,
  finalStatus: "SUCCEEDED" | "FAILED",
) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select()
      .from(businessUsageReservationsTable)
      .where(
        and(
          eq(businessUsageReservationsTable.id, reservationId),
          eq(businessUsageReservationsTable.status, "PENDING"),
        ),
      )
      .limit(1);
    if (!reservation) return false;

    const [period] = await tx
      .select()
      .from(businessUsagePeriodsTable)
      .where(
        and(
          eq(businessUsagePeriodsTable.businessId, reservation.businessId),
          eq(businessUsagePeriodsTable.metric, reservation.metric),
          eq(businessUsagePeriodsTable.periodStart, reservation.periodStart),
        ),
      )
      .limit(1);
    if (!period) throw new Error("Usage period for reservation no longer exists.");

    await tx
      .update(businessUsagePeriodsTable)
      .set({
        used:
          finalStatus === "SUCCEEDED"
            ? sql`${businessUsagePeriodsTable.used} + ${reservation.amount}`
            : undefined,
        reserved: sql`${businessUsagePeriodsTable.reserved} - ${reservation.amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessUsagePeriodsTable.id, period.id),
          gt(businessUsagePeriodsTable.reserved, 0),
        ),
      );
    await tx
      .update(businessUsageReservationsTable)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(
        and(
          eq(businessUsageReservationsTable.id, reservationId),
          eq(businessUsageReservationsTable.status, "PENDING"),
        ),
      );
    return true;
  });
}

export function completeBusinessUsageReservation(reservationId: string) {
  return settleReservation(reservationId, "SUCCEEDED");
}

export function releaseBusinessUsageReservation(reservationId: string) {
  return settleReservation(reservationId, "FAILED");
}

export async function getBusinessUsageSummary(
  organizationId: string,
  businessId: string,
  now = new Date(),
): Promise<BusinessUsageSummaryItem[]> {
  return db.transaction(async (tx) => {
    for (const metric of METRICS) {
      await ensurePeriod(tx, organizationId, businessId, metric, now);
    }
    const rows = await tx
      .select()
      .from(businessUsagePeriodsTable)
      .where(
        and(
          eq(businessUsagePeriodsTable.organizationId, organizationId),
          eq(businessUsagePeriodsTable.businessId, businessId),
          or(...METRICS.map((metric) => {
            const period = periodFor(metric, now);
            return and(
              eq(businessUsagePeriodsTable.metric, metric),
              eq(businessUsagePeriodsTable.periodStart, period.start),
            );
          })),
        ),
      );

    return METRICS.map((metric) => {
      const period = periodFor(metric, now);
      const row = rows.find(
        (candidate) =>
          candidate.metric === metric &&
          candidate.periodStart.getTime() === period.start.getTime(),
      );
      const config = BUSINESS_USAGE_CONFIG[metric];
      const used = row?.used ?? 0;
      const reserved = row?.reserved ?? 0;
      return {
        metric,
        label: config.label,
        window: config.window,
        used,
        reserved,
        limit: row?.limit ?? config.limit,
        remaining: Math.max(0, (row?.limit ?? config.limit) - used - reserved),
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      };
    });
  });
}