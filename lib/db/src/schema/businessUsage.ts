import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { organizationsTable } from "./organizations";

export const businessUsageMetricValues = [
  "GOOGLE_REVIEW_IMPORTS",
  "AI_REVIEW_REPLIES",
  "PUBLIC_AI_GENERATIONS",
  "SOCIAL_POSTS",
  "SOCIAL_POSTS_MONTHLY",
  "SOCIAL_COMMENT_IMPORTS",
  "SOCIAL_COMMENT_DAILY_UNITS",
  "SOCIAL_COMMENT_REPLIES",
  "SOCIAL_MEDIA_UPLOADS",
  "SOCIAL_MEDIA_UPLOADS_MONTHLY",
] as const;

export type BusinessUsageMetric = (typeof businessUsageMetricValues)[number];

export const businessUsageReservationStatusValues = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
] as const;

export type BusinessUsageReservationStatus =
  (typeof businessUsageReservationStatusValues)[number];

/**
 * One row per business, metric, and UTC reporting window. `reserved` is kept
 * separate from `used` so provider work can be accounted for atomically before
 * a slow request and released when that request fails.
 */
export const businessUsagePeriodsTable = pgTable(
  "business_usage_periods",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    metric: text("metric").notNull().$type<BusinessUsageMetric>(),
    periodStart: timestamp("period_start", {
      withTimezone: true,
    }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    limit: integer("limit").notNull(),
    used: integer("used").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_usage_periods_business_metric_start_idx").on(
      table.businessId,
      table.metric,
      table.periodStart,
    ),
    index("business_usage_periods_organization_id_idx").on(table.organizationId),
    index("business_usage_periods_business_id_idx").on(table.businessId),
  ],
);

export const businessUsageReservationsTable = pgTable(
  "business_usage_reservations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    metric: text("metric").notNull().$type<BusinessUsageMetric>(),
    periodStart: timestamp("period_start", {
      withTimezone: true,
    }).notNull(),
    amount: integer("amount").notNull(),
    providerAttemptId: text("provider_attempt_id"),
    status: text("status")
      .notNull()
      .default("PENDING")
      .$type<BusinessUsageReservationStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("business_usage_reservations_business_id_idx").on(table.businessId),
    index("business_usage_reservations_business_created_at_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("business_usage_reservations_status_idx").on(table.status),
    index("business_usage_reservations_cleanup_idx").on(
      table.status,
      table.updatedAt,
    ),
    index("business_usage_reservations_provider_attempt_idx").on(
      table.providerAttemptId,
    ),
  ],
);

export type BusinessUsagePeriod =
  typeof businessUsagePeriodsTable.$inferSelect;
export type BusinessUsageReservation =
  typeof businessUsageReservationsTable.$inferSelect;