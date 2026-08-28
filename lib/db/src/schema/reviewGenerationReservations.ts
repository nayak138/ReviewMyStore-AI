import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type ReviewGenerationReservationStatus =
  "PENDING" | "SUCCEEDED" | "FAILED";

/**
 * One durable record per public AI generation attempt. The counters on the
 * organization and session are reserved before the provider call; this row
 * lets a failure release exactly its own reservation without touching a
 * concurrent successful request.
 *
 * These IDs intentionally do not cascade from the related records. An
 * in-flight provider call must still be able to release organization quota
 * if a campaign or session is removed while it is running.
 */
export const reviewGenerationReservationsTable = pgTable(
  "review_generation_reservations",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    campaignId: text("campaign_id").notNull(),
    organizationId: text("organization_id").notNull(),
    status: text("status")
      .notNull()
      .default("PENDING")
      .$type<ReviewGenerationReservationStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_generation_reservations_session_id_idx").on(table.sessionId),
    index("review_generation_reservations_organization_id_idx").on(
      table.organizationId,
    ),
    index("review_generation_reservations_status_idx").on(table.status),
    index("review_generation_reservations_cleanup_idx").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export type ReviewGenerationReservation =
  typeof reviewGenerationReservationsTable.$inferSelect;
