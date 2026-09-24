import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sharedProviderUsagePeriodsTable = pgTable(
  "shared_provider_usage_periods",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerAccount: text("provider_account").notNull(),
    metric: text("metric").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
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
    uniqueIndex("shared_provider_usage_periods_account_metric_start_idx").on(
      table.providerAccount,
      table.metric,
      table.periodStart,
    ),
  ],
);

export const sharedProviderUsageReservationsTable = pgTable(
  "shared_provider_usage_reservations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerAccount: text("provider_account").notNull(),
    metric: text("metric").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    amount: integer("amount").notNull(),
    providerAttemptId: text("provider_attempt_id"),
    providerAttemptStatus: text(
      "provider_attempt_status",
    ).$type<SharedProviderAttemptStatus>(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shared_provider_usage_reservations_period_start_idx").on(
      table.providerAccount,
      table.metric,
      table.periodStart,
    ),
    index("shared_provider_usage_reservations_status_idx").on(
      table.status,
      table.updatedAt,
    ),
    index("shared_provider_usage_reservations_attempt_idx").on(
      table.providerAttemptId,
      table.providerAttemptStatus,
    ),
  ],
);

export type SharedProviderAttemptStatus =
  "NOT_STARTED" | "IN_FLIGHT" | "ACCEPTED" | "REJECTED";

export type SharedProviderUsageReservation =
  typeof sharedProviderUsageReservationsTable.$inferSelect;