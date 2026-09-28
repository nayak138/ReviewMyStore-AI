import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  like,
  or,
  sql,
} from "drizzle-orm";
import {
  businessSocialCommentsTable,
  businessUsagePeriodsTable,
  businessUsageReservationsTable,
  businessesTable,
  db,
  objectUploadsTable,
  organizationsTable,
  sharedProviderUsagePeriodsTable,
  sharedProviderUsageReservationsTable,
  type BusinessUsageMetric,
} from "@workspace/db";
import type { PgTransaction } from "drizzle-orm/pg-core";

type UsageWindow = "DAILY" | "MONTHLY";

type UsageMetricConfig = {
  label: string;
  limit: number;
  window: UsageWindow;
  allowMonthlyOverage?: boolean;
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
    limit: 600,
    window: "MONTHLY",
  },
  SOCIAL_POSTS: {
    label: "Social posts today",
    limit: 10,
    window: "DAILY",
  },
  SOCIAL_POSTS_MONTHLY: {
    label: "Social posts this month",
    limit: 50,
    window: "MONTHLY",
    allowMonthlyOverage: true,
  },
  SOCIAL_COMMENT_IMPORTS: {
    label: "Imported social comments this month",
    limit: 25,
    window: "MONTHLY",
    allowMonthlyOverage: true,
  },
  SOCIAL_COMMENT_DAILY_UNITS: {
    label: "Comment units today",
    limit: 5,
    window: "DAILY",
  },
  SOCIAL_COMMENT_REPLIES: {
    label: "Legacy social comment replies",
    limit: 50,
    window: "DAILY",
  },
  SOCIAL_MEDIA_UPLOADS: {
    label: "Social media uploads today",
    limit: 100,
    window: "DAILY",
  },
  SOCIAL_MEDIA_UPLOADS_MONTHLY: {
    label: "Social media uploads this month",
    limit: 500,
    window: "MONTHLY",
    allowMonthlyOverage: true,
  },
};

const METRICS: BusinessUsageMetric[] = [
  "GOOGLE_REVIEW_IMPORTS",
  "AI_REVIEW_REPLIES",
  "PUBLIC_AI_GENERATIONS",
  "SOCIAL_POSTS",
  "SOCIAL_POSTS_MONTHLY",
  "SOCIAL_COMMENT_IMPORTS",
  "SOCIAL_COMMENT_DAILY_UNITS",
  "SOCIAL_MEDIA_UPLOADS",
  "SOCIAL_MEDIA_UPLOADS_MONTHLY",
];
const SHARED_REVIEW_IMPORT_ACCOUNT = "BNDLE_SOCIAL";
const SHARED_REVIEW_IMPORT_METRIC = "GOOGLE_REVIEW_IMPORTS";
export const SHARED_REVIEW_IMPORT_MONTHLY_LIMIT = 200;

export class SharedReviewImportLimitError extends Error {
  readonly status = 429;
  readonly code = "SHARED_PROVIDER_USAGE_LIMIT_REACHED";

  constructor(
    readonly limit: number,
    readonly used: number,
    readonly requested: number,
    readonly periodEnd: Date,
  ) {
    super(
      `The shared bundle.social review-import allowance is exhausted for this month. Existing reviews remain available; ask your administrator to increase the provider import allowance or try again after it resets on ${periodEnd.toISOString()}.`,
    );
    this.name = "SharedReviewImportLimitError";
  }
}

export type SharedReviewImportReservation = {
  id: string;
  amount: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
};

export const REVIEW_IMPORT_ATTEMPT_STALE_AFTER_MS = 5 * 60_000;

function monthlyPeriod(now: Date) {
  const start = new Date(now);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

async function ensureSharedReviewImportPeriod(tx: UsageTransaction, now: Date) {
  const period = monthlyPeriod(now);
  await tx
    .insert(sharedProviderUsagePeriodsTable)
    .values({
      providerAccount: SHARED_REVIEW_IMPORT_ACCOUNT,
      metric: SHARED_REVIEW_IMPORT_METRIC,
      periodStart: period.start,
      periodEnd: period.end,
      limit: SHARED_REVIEW_IMPORT_MONTHLY_LIMIT,
    })
    .onConflictDoNothing({
      target: [
        sharedProviderUsagePeriodsTable.providerAccount,
        sharedProviderUsagePeriodsTable.metric,
        sharedProviderUsagePeriodsTable.periodStart,
      ],
    });

  const [row] = await tx
    .select()
    .from(sharedProviderUsagePeriodsTable)
    .where(
      and(
        eq(
          sharedProviderUsagePeriodsTable.providerAccount,
          SHARED_REVIEW_IMPORT_ACCOUNT,
        ),
        eq(sharedProviderUsagePeriodsTable.metric, SHARED_REVIEW_IMPORT_METRIC),
        eq(sharedProviderUsagePeriodsTable.periodStart, period.start),
      ),
    )
    .limit(1);
  if (!row)
    throw new Error("Could not initialize the shared provider usage period.");
  return row;
}

/**
 * The shared bundle.social account has one monthly import pool across every
 * business and organization. Lock only the period row during reservation;
 * provider network requests happen after this transaction commits.
 */
export async function reserveSharedReviewImportCapacity(input: {
  amount: number;
  now?: Date;
  providerAttemptId?: string;
}): Promise<SharedReviewImportReservation> {
  if (!Number.isInteger(input.amount) || input.amount < 1) {
    throw new Error(
      "Shared provider usage reservation amount must be a positive integer.",
    );
  }
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const ensured = await ensureSharedReviewImportPeriod(tx, now);
    const [period] = await tx
      .select()
      .from(sharedProviderUsagePeriodsTable)
      .where(eq(sharedProviderUsagePeriodsTable.id, ensured.id))
      .for("update")
      .limit(1);
    if (!period)
      throw new Error("Shared provider usage period no longer exists.");

    const available = Math.max(0, period.limit - period.used - period.reserved);
    const amount = Math.min(input.amount, available);
    if (amount === 0) {
      throw new SharedReviewImportLimitError(
        period.limit,
        period.used + period.reserved,
        input.amount,
        period.periodEnd,
      );
    }

    const [updated] = await tx
      .update(sharedProviderUsagePeriodsTable)
      .set({
        reserved: period.reserved + amount,
        updatedAt: new Date(),
      })
      .where(eq(sharedProviderUsagePeriodsTable.id, period.id))
      .returning();
    if (!updated)
      throw new Error("Could not reserve shared provider capacity.");

    const [reservation] = await tx
      .insert(sharedProviderUsageReservationsTable)
      .values({
        providerAccount: SHARED_REVIEW_IMPORT_ACCOUNT,
        metric: SHARED_REVIEW_IMPORT_METRIC,
        periodStart: period.periodStart,
        amount,
        providerAttemptId: input.providerAttemptId ?? null,
        providerAttemptStatus: input.providerAttemptId ? "NOT_STARTED" : null,
      })
      .returning();
    if (!reservation) {
      throw new Error("Could not create a shared provider usage reservation.");
    }

    return {
      id: reservation.id,
      amount,
      remaining: updated.limit - updated.used - updated.reserved,
      periodStart: updated.periodStart,
      periodEnd: updated.periodEnd,
    };
  });
}

async function settleSharedReviewImportReservation(
  reservationId: string,
  finalStatus: "SUCCEEDED" | "FAILED",
) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select()
      .from(sharedProviderUsageReservationsTable)
      .where(
        and(
          eq(sharedProviderUsageReservationsTable.id, reservationId),
          eq(sharedProviderUsageReservationsTable.status, "PENDING"),
        ),
      )
      .for("update")
      .limit(1);
    if (!reservation) return false;

    const [period] = await tx
      .select()
      .from(sharedProviderUsagePeriodsTable)
      .where(
        and(
          eq(
            sharedProviderUsagePeriodsTable.providerAccount,
            reservation.providerAccount,
          ),
          eq(sharedProviderUsagePeriodsTable.metric, reservation.metric),
          eq(
            sharedProviderUsagePeriodsTable.periodStart,
            reservation.periodStart,
          ),
        ),
      )
      .for("update")
      .limit(1);
    if (!period) {
      throw new Error(
        "Shared provider usage period for reservation no longer exists.",
      );
    }
    if (period.reserved < reservation.amount) {
      throw new Error(
        "Shared provider usage reservation exceeds reserved capacity.",
      );
    }

    await tx
      .update(sharedProviderUsagePeriodsTable)
      .set({
        used:
          finalStatus === "SUCCEEDED"
            ? sql`${sharedProviderUsagePeriodsTable.used} + ${reservation.amount}`
            : undefined,
        reserved: period.reserved - reservation.amount,
        updatedAt: new Date(),
      })
      .where(eq(sharedProviderUsagePeriodsTable.id, period.id));
    await tx
      .update(sharedProviderUsageReservationsTable)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(
        and(
          eq(sharedProviderUsageReservationsTable.id, reservationId),
          eq(sharedProviderUsageReservationsTable.status, "PENDING"),
        ),
      );
    return true;
  });
}

export function completeSharedReviewImportReservation(reservationId: string) {
  return settleSharedReviewImportReservation(reservationId, "SUCCEEDED");
}

export function releaseSharedReviewImportReservation(reservationId: string) {
  return settleSharedReviewImportReservation(reservationId, "FAILED");
}

async function updateReviewImportAttemptStatus(
  providerAttemptId: string,
  expected: "NOT_STARTED" | "IN_FLIGHT",
  status: "IN_FLIGHT" | "ACCEPTED" | "REJECTED",
): Promise<boolean> {
  const [updated] = await db
    .update(sharedProviderUsageReservationsTable)
    .set({ providerAttemptStatus: status, updatedAt: new Date() })
    .where(
      and(
        eq(
          sharedProviderUsageReservationsTable.providerAttemptId,
          providerAttemptId,
        ),
        eq(
          sharedProviderUsageReservationsTable.providerAttemptStatus,
          expected,
        ),
        eq(sharedProviderUsageReservationsTable.status, "PENDING"),
      ),
    )
    .returning({ id: sharedProviderUsageReservationsTable.id });
  return Boolean(updated);
}

export function markSharedReviewImportAttemptStarted(
  providerAttemptId: string,
) {
  return updateReviewImportAttemptStatus(
    providerAttemptId,
    "NOT_STARTED",
    "IN_FLIGHT",
  );
}

export function markSharedReviewImportAttemptAccepted(
  providerAttemptId: string,
) {
  return updateReviewImportAttemptStatus(
    providerAttemptId,
    "IN_FLIGHT",
    "ACCEPTED",
  );
}

export function markSharedReviewImportAttemptRejected(
  providerAttemptId: string,
) {
  return updateReviewImportAttemptStatus(
    providerAttemptId,
    "IN_FLIGHT",
    "REJECTED",
  );
}

export async function listStaleUncertainSharedReviewImportReservations(
  now = new Date(),
) {
  const staleBefore = new Date(
    now.getTime() - REVIEW_IMPORT_ATTEMPT_STALE_AFTER_MS,
  );
  return db
    .select({
      id: sharedProviderUsageReservationsTable.id,
      providerAttemptId: sharedProviderUsageReservationsTable.providerAttemptId,
      amount: sharedProviderUsageReservationsTable.amount,
      attemptedAt: sharedProviderUsageReservationsTable.createdAt,
      providerAttemptStatus:
        sharedProviderUsageReservationsTable.providerAttemptStatus,
      businessId: businessUsageReservationsTable.businessId,
      organizationId: businessUsageReservationsTable.organizationId,
      businessName: businessesTable.name,
      organizationName: organizationsTable.name,
    })
    .from(sharedProviderUsageReservationsTable)
    .leftJoin(
      businessUsageReservationsTable,
      and(
        eq(
          businessUsageReservationsTable.providerAttemptId,
          sharedProviderUsageReservationsTable.providerAttemptId,
        ),
        eq(businessUsageReservationsTable.metric, "GOOGLE_REVIEW_IMPORTS"),
        eq(businessUsageReservationsTable.status, "PENDING"),
      ),
    )
    .leftJoin(
      businessesTable,
      eq(businessesTable.id, businessUsageReservationsTable.businessId),
    )
    .leftJoin(
      organizationsTable,
      eq(
        organizationsTable.id,
        businessUsageReservationsTable.organizationId,
      ),
    )
    .where(
      and(
        eq(
          sharedProviderUsageReservationsTable.providerAccount,
          SHARED_REVIEW_IMPORT_ACCOUNT,
        ),
        eq(
          sharedProviderUsageReservationsTable.metric,
          SHARED_REVIEW_IMPORT_METRIC,
        ),
        eq(sharedProviderUsageReservationsTable.status, "PENDING"),
        inArray(
          sharedProviderUsageReservationsTable.providerAttemptStatus,
          ["IN_FLIGHT", "ACCEPTED", "REJECTED"],
        ),
        isNotNull(sharedProviderUsageReservationsTable.providerAttemptId),
        lte(sharedProviderUsageReservationsTable.updatedAt, staleBefore),
      ),
    )
    .orderBy(desc(sharedProviderUsageReservationsTable.updatedAt));
}

/**
 * Settle only after a provider import record has been independently matched
 * to this attempt. Keep the attempt's original timestamp so the existing
 * stale reconciler can retry if one of the ledger writes fails partway through.
 */
export async function completeSharedReviewImportReservationWithEvidence(
  reservationId: string,
): Promise<boolean> {
  const [reservation] = await db
    .select()
    .from(sharedProviderUsageReservationsTable)
    .where(eq(sharedProviderUsageReservationsTable.id, reservationId))
    .limit(1);

  if (!reservation) return false;
  if (reservation.status !== "PENDING") {
    return reservation.status === "SUCCEEDED";
  }
  if (!reservation.providerAttemptId) return false;

  let attemptStatus = reservation.providerAttemptStatus;
  if (attemptStatus === "IN_FLIGHT") {
    const [accepted] = await db
      .update(sharedProviderUsageReservationsTable)
      .set({ providerAttemptStatus: "ACCEPTED" })
      .where(
        and(
          eq(sharedProviderUsageReservationsTable.id, reservationId),
          eq(sharedProviderUsageReservationsTable.status, "PENDING"),
          eq(
            sharedProviderUsageReservationsTable.providerAttemptStatus,
            "IN_FLIGHT",
          ),
        ),
      )
      .returning({ id: sharedProviderUsageReservationsTable.id });

    if (accepted) {
      attemptStatus = "ACCEPTED";
    } else {
      const [current] = await db
        .select({
          status: sharedProviderUsageReservationsTable.status,
          providerAttemptStatus:
            sharedProviderUsageReservationsTable.providerAttemptStatus,
        })
        .from(sharedProviderUsageReservationsTable)
        .where(eq(sharedProviderUsageReservationsTable.id, reservationId))
        .limit(1);
      if (current?.status === "SUCCEEDED") return true;
      attemptStatus = current?.providerAttemptStatus ?? null;
    }
  }

  if (attemptStatus !== "ACCEPTED") return false;

  await settleBusinessUsageReservationsForReviewImportAttempt(
    reservation.providerAttemptId,
    "SUCCEEDED",
  );
  const settled = await completeSharedReviewImportReservation(reservationId);
  if (settled) return true;

  const [current] = await db
    .select({ status: sharedProviderUsageReservationsTable.status })
    .from(sharedProviderUsageReservationsTable)
    .where(eq(sharedProviderUsageReservationsTable.id, reservationId))
    .limit(1);
  return current?.status === "SUCCEEDED";
}

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
  nearLimit: boolean;
  warningThresholdPercent: number;
  periodStart: string;
  periodEnd: string;
};

export type BusinessUsageBillingCategory = {
  metric:
    | "SOCIAL_POSTS_MONTHLY"
    | "SOCIAL_COMMENT_IMPORTS"
    | "SOCIAL_MEDIA_UPLOADS_MONTHLY";
  label: string;
  used: number;
  baseLimit: number;
  multiplier: number;
};

export type BusinessUsageBilling = {
  quotedMonthlyBaseAmountCents: number | null;
  currency: string;
  highestMultiplier: number;
  manualInvoiceTotalCents: number | null;
  categories: BusinessUsageBillingCategory[];
};

export type BusinessUsageHistoryItem = {
  id: string;
  metric: BusinessUsageMetric;
  label: string;
  window: UsageWindow;
  amount: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
  updatedAt: string;
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
  providerAttemptId?: string;
  allowMonthlyOverage?: boolean;
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
          ...(input.allowMonthlyOverage &&
          BUSINESS_USAGE_CONFIG[input.metric].allowMonthlyOverage
            ? []
            : [
                sql`${businessUsagePeriodsTable.used} + ${businessUsagePeriodsTable.reserved} + ${amount} <= ${businessUsagePeriodsTable.limit}`,
              ]),
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
        providerAttemptId: input.providerAttemptId ?? null,
      })
      .returning();
    if (!reservation) throw new Error("Could not create usage reservation.");

    return {
      id: reservation.id,
      metric: input.metric,
      amount,
      remaining: Math.max(0, updated.limit - updated.used - updated.reserved),
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
      .for("update")
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

    const [updatedPeriod] = await tx
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
          gte(businessUsagePeriodsTable.reserved, reservation.amount),
        ),
      )
      .returning({ id: businessUsagePeriodsTable.id });
    if (!updatedPeriod) {
      throw new Error("Usage reservation exceeds its period's reserved amount.");
    }
    const [settled] = await tx
      .update(businessUsageReservationsTable)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(
        and(
          eq(businessUsageReservationsTable.id, reservationId),
          eq(businessUsageReservationsTable.status, "PENDING"),
        ),
      )
      .returning({ id: businessUsageReservationsTable.id });
    return Boolean(settled);
  });
}

export function completeBusinessUsageReservation(reservationId: string) {
  return settleReservation(reservationId, "SUCCEEDED");
}

export function releaseBusinessUsageReservation(reservationId: string) {
  return settleReservation(reservationId, "FAILED");
}

export async function settleBusinessUsageReservationsForReviewImportAttempt(
  providerAttemptId: string,
  finalStatus: "SUCCEEDED" | "FAILED",
): Promise<number> {
  const reservations = await db
    .select({ id: businessUsageReservationsTable.id })
    .from(businessUsageReservationsTable)
    .where(
      and(
        eq(businessUsageReservationsTable.providerAttemptId, providerAttemptId),
        eq(businessUsageReservationsTable.status, "PENDING"),
      ),
    );
  let settled = 0;
  for (const reservation of reservations) {
    const didSettle =
      finalStatus === "SUCCEEDED"
        ? await completeBusinessUsageReservation(reservation.id)
        : await releaseBusinessUsageReservation(reservation.id);
    if (didSettle) settled += 1;
  }
  return settled;
}

/**
 * Resolve only stale attempts with a persisted outcome. NOT_STARTED means the
 * provider request was never dispatched; REJECTED is an explicit provider
 * rejection; ACCEPTED is charged even if the API stopped before settlement.
 * IN_FLIGHT remains reserved because its outcome is ambiguous.
 */
export async function reconcileStaleSharedReviewImportReservations(
  now = new Date(),
): Promise<number> {
  const staleBefore = new Date(
    now.getTime() - REVIEW_IMPORT_ATTEMPT_STALE_AFTER_MS,
  );
  const staleReservations = await db
    .select()
    .from(sharedProviderUsageReservationsTable)
    .where(
      and(
        eq(sharedProviderUsageReservationsTable.status, "PENDING"),
        isNotNull(sharedProviderUsageReservationsTable.providerAttemptId),
        lte(sharedProviderUsageReservationsTable.updatedAt, staleBefore),
        inArray(sharedProviderUsageReservationsTable.providerAttemptStatus, [
          "NOT_STARTED",
          "ACCEPTED",
          "REJECTED",
        ]),
      ),
    );

  let reconciled = 0;
  for (const reservation of staleReservations) {
    const providerAttemptId = reservation.providerAttemptId;
    const attemptStatus = reservation.providerAttemptStatus;
    if (!providerAttemptId || !attemptStatus) continue;
    const claimed = await db
      .update(sharedProviderUsageReservationsTable)
      .set({
        providerAttemptStatus:
          attemptStatus === "NOT_STARTED" ? "REJECTED" : attemptStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sharedProviderUsageReservationsTable.id, reservation.id),
          eq(sharedProviderUsageReservationsTable.status, "PENDING"),
          eq(
            sharedProviderUsageReservationsTable.providerAttemptStatus,
            attemptStatus,
          ),
          lte(sharedProviderUsageReservationsTable.updatedAt, staleBefore),
        ),
      )
      .returning({ id: sharedProviderUsageReservationsTable.id });
    if (!claimed.length) continue;

    const wasAccepted = attemptStatus === "ACCEPTED";
    await settleBusinessUsageReservationsForReviewImportAttempt(
      providerAttemptId,
      wasAccepted ? "SUCCEEDED" : "FAILED",
    );
    const settled = wasAccepted
      ? await completeSharedReviewImportReservation(reservation.id)
      : await releaseSharedReviewImportReservation(reservation.id);
    if (settled) reconciled += 1;
  }
  return reconciled;
}

export async function getBusinessUsageSummary(
  organizationId: string,
  businessId: string,
  now = new Date(),
): Promise<BusinessUsageSummaryItem[]> {
  await releaseExpiredMediaUploadReservations(now, businessId);
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
        nearLimit:
          used + reserved >=
          Math.ceil((row?.limit ?? config.limit) * 0.8),
        warningThresholdPercent: 80,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      };
    });
  });
}

export function monthlyMetaMultiplier(used: number, baseLimit: number): number {
  return Math.max(1, Math.ceil(Math.max(0, used) / baseLimit));
}

export async function getBusinessUsageBilling(
  organizationId: string,
  businessId: string,
  now = new Date(),
): Promise<BusinessUsageBilling> {
  const [business] = await db
    .select({
      quotedMonthlyBaseAmountCents:
        businessesTable.quotedMonthlyBaseAmountCents,
      currency: businessesTable.quotedMonthlyCurrency,
    })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!business) throw new Error("Business not found.");

  const summary = await getBusinessUsageSummary(organizationId, businessId, now);
  const categoryConfigs = [
    {
      metric: "SOCIAL_POSTS_MONTHLY" as const,
      label: "Social posts",
      baseLimit: BUSINESS_USAGE_CONFIG.SOCIAL_POSTS_MONTHLY.limit,
    },
    {
      metric: "SOCIAL_COMMENT_IMPORTS" as const,
      label: "Imported social comments",
      baseLimit: BUSINESS_USAGE_CONFIG.SOCIAL_COMMENT_IMPORTS.limit,
    },
    {
      metric: "SOCIAL_MEDIA_UPLOADS_MONTHLY" as const,
      label: "Social media uploads",
      baseLimit: BUSINESS_USAGE_CONFIG.SOCIAL_MEDIA_UPLOADS_MONTHLY.limit,
    },
  ];
  const categories = categoryConfigs.map((category) => {
    const row = summary.find((item) => item.metric === category.metric);
    const used = row?.used ?? 0;
    return {
      ...category,
      used,
      multiplier: monthlyMetaMultiplier(used, category.baseLimit),
    };
  });
  const highestMultiplier = Math.max(
    1,
    ...categories.map((category) => category.multiplier),
  );
  return {
    quotedMonthlyBaseAmountCents: business.quotedMonthlyBaseAmountCents,
    currency: business.currency,
    highestMultiplier,
    manualInvoiceTotalCents:
      business.quotedMonthlyBaseAmountCents === null
        ? null
        : business.quotedMonthlyBaseAmountCents * highestMultiplier,
    categories,
  };
}

export async function assertBusinessUsageAvailable(input: {
  organizationId: string;
  businessId: string;
  metric: BusinessUsageMetric;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const item = (await getBusinessUsageSummary(
    input.organizationId,
    input.businessId,
    now,
  )).find((usage) => usage.metric === input.metric);
  if (!item) throw new Error("Business usage period could not be loaded.");
  if (item.remaining < 1) {
    throw new BusinessUsageLimitError(
      input.metric,
      item.limit,
      item.used + item.reserved,
      1,
      new Date(item.periodEnd),
    );
  }
  return item.remaining;
}

/**
 * Count fetched provider comments only when they are visible as completed
 * imported records. Each new comment consumes one UTC daily comment unit and
 * is counted once toward the monthly import allowance.
 * The unique business/comment key makes repeated refreshes idempotent.
 */
export async function recordImportedSocialComments(input: {
  organizationId: string;
  businessId: string;
  comments: Array<{ id: string; postId?: string | null }>;
  now?: Date;
}): Promise<Set<string>> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const monthlyPeriod = await ensurePeriod(
      tx,
      input.organizationId,
      input.businessId,
      "SOCIAL_COMMENT_IMPORTS",
      now,
    );
    const dailyPeriod = await ensurePeriod(
      tx,
      input.organizationId,
      input.businessId,
      "SOCIAL_COMMENT_DAILY_UNITS",
      now,
    );
    const [lockedDailyPeriod] = await tx
      .select()
      .from(businessUsagePeriodsTable)
      .where(eq(businessUsagePeriodsTable.id, dailyPeriod.id))
      .for("update")
      .limit(1);
    if (!lockedDailyPeriod) {
      throw new Error("Daily comment usage period could not be locked.");
    }
    const newlyImported = new Set<string>();
    for (const comment of input.comments) {
      if (
        !comment.id ||
        lockedDailyPeriod.used + lockedDailyPeriod.reserved >=
          lockedDailyPeriod.limit
      ) {
        continue;
      }
      const [created] = await tx
        .insert(businessSocialCommentsTable)
        .values({
          organizationId: input.organizationId,
          businessId: input.businessId,
          providerCommentId: comment.id,
          providerPostId: comment.postId ?? null,
          importedAt: now,
        })
        .onConflictDoNothing({
          target: [
            businessSocialCommentsTable.businessId,
            businessSocialCommentsTable.providerCommentId,
          ],
        })
        .returning({
          providerCommentId: businessSocialCommentsTable.providerCommentId,
        });
      if (!created) continue;
      newlyImported.add(created.providerCommentId);
      const [updatedDailyPeriod] = await tx
        .update(businessUsagePeriodsTable)
        .set({
          used: sql`${businessUsagePeriodsTable.used} + 1`,
          updatedAt: now,
        })
        .where(eq(businessUsagePeriodsTable.id, lockedDailyPeriod.id))
        .returning({ id: businessUsagePeriodsTable.id });
      const [updatedMonthlyPeriod] = await tx
        .update(businessUsagePeriodsTable)
        .set({
          used: sql`${businessUsagePeriodsTable.used} + 1`,
          updatedAt: now,
        })
        .where(eq(businessUsagePeriodsTable.id, monthlyPeriod.id))
        .returning({ id: businessUsagePeriodsTable.id });
      if (!updatedDailyPeriod || !updatedMonthlyPeriod) {
        throw new Error("Could not settle imported comment usage.");
      }
      await tx.insert(businessUsageReservationsTable).values({
        organizationId: input.organizationId,
        businessId: input.businessId,
        metric: "SOCIAL_COMMENT_DAILY_UNITS",
        periodStart: dailyPeriod.periodStart,
        amount: 1,
        status: "SUCCEEDED",
        createdAt: now,
        updatedAt: now,
      });
      lockedDailyPeriod.used += 1;
    }
    return newlyImported;
  });
}

export async function settleMediaUploadReservations(
  objectPath: string,
  status: "SUCCEEDED" | "FAILED",
): Promise<number> {
  const reservations = await db
    .select({ id: businessUsageReservationsTable.id })
    .from(businessUsageReservationsTable)
    .where(
      and(
        eq(
          businessUsageReservationsTable.providerAttemptId,
          `social-media-upload:${objectPath}`,
        ),
        eq(businessUsageReservationsTable.status, "PENDING"),
      ),
    );
  let settled = 0;
  for (const reservation of reservations) {
    const didSettle =
      status === "SUCCEEDED"
        ? await completeBusinessUsageReservation(reservation.id)
        : await releaseBusinessUsageReservation(reservation.id);
    if (didSettle) settled += 1;
  }
  return settled;
}

export async function releaseExpiredMediaUploadReservations(
  now = new Date(),
  businessId?: string,
) {
  const expiredBefore = new Date(now.getTime() - 15 * 60_000);
  const stale = await db
    .select({
      id: businessUsageReservationsTable.id,
      providerAttemptId: businessUsageReservationsTable.providerAttemptId,
    })
    .from(businessUsageReservationsTable)
    .where(
      and(
        inArray(businessUsageReservationsTable.metric, [
          "SOCIAL_MEDIA_UPLOADS",
          "SOCIAL_MEDIA_UPLOADS_MONTHLY",
        ]),
        ...(businessId
          ? [eq(businessUsageReservationsTable.businessId, businessId)]
          : []),
        eq(businessUsageReservationsTable.status, "PENDING"),
        isNotNull(businessUsageReservationsTable.providerAttemptId),
        like(
          businessUsageReservationsTable.providerAttemptId,
          "social-media-upload:%",
        ),
        lte(businessUsageReservationsTable.createdAt, expiredBefore),
      ),
    );
  let released = 0;
  for (const reservation of stale) {
    const objectPath = reservation.providerAttemptId?.replace(
      "social-media-upload:",
      "",
    );
    if (!objectPath) continue;
    const [upload] = await db
      .select({ finalizedAt: objectUploadsTable.finalizedAt })
      .from(objectUploadsTable)
      .where(eq(objectUploadsTable.objectPath, objectPath))
      .limit(1);
    if (upload?.finalizedAt) continue;
    if (await releaseBusinessUsageReservation(reservation.id)) released += 1;
  }
  return released;
}

export async function getBusinessUsageHistory(
  organizationId: string,
  businessId: string,
  limit = 12,
): Promise<BusinessUsageHistoryItem[]> {
  const rows = await db
    .select()
    .from(businessUsageReservationsTable)
    .where(
      and(
        eq(businessUsageReservationsTable.organizationId, organizationId),
        eq(businessUsageReservationsTable.businessId, businessId),
      ),
    )
    .orderBy(desc(businessUsageReservationsTable.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const config = BUSINESS_USAGE_CONFIG[row.metric];
    const period = periodFor(row.metric, row.periodStart);
    return {
      id: row.id,
      metric: row.metric,
      label: config.label,
      window: config.window,
      amount: row.amount,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
    };
  });
}