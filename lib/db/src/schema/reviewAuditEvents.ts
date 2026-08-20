import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { managedReviewsTable } from "./managedReviews";
import { usersTable } from "./users";

/** Append-only history for generated drafts and provider-side reply actions. */
export const reviewAuditEventsTable = pgTable(
  "review_audit_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    managedReviewId: text("managed_review_id")
      .notNull()
      .references(() => managedReviewsTable.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_audit_events_review_created_idx").on(
      table.managedReviewId,
      table.createdAt,
    ),
    index("review_audit_events_organization_id_idx").on(table.organizationId),
  ],
);

export const insertReviewAuditEventSchema = createInsertSchema(
  reviewAuditEventsTable,
).omit({ id: true, createdAt: true });
export type InsertReviewAuditEvent = z.infer<
  typeof insertReviewAuditEventSchema
>;
export type ReviewAuditEvent = typeof reviewAuditEventsTable.$inferSelect;