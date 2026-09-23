import { pgTable, text, timestamp, integer, pgEnum, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { businessesTable } from "./businesses";
import { campaignsTable } from "./campaigns";
import { notificationDeliveryStatusEnum } from "./notificationDelivery";

// NEW: submitted, not yet opened by the owner.
// VIEWED: an owner has opened/read it.
// RESOLVED: the owner marked the issue as handled.
export const privateFeedbackStatusEnum = pgEnum("private_feedback_status", [
  "NEW",
  "VIEWED",
  "RESOLVED",
]);

// Captures what a customer told the business privately after choosing 1 or
// 2 stars on the public review page, instead of (or before) posting
// publicly to Google. Never exposed on any public endpoint — only readable
// by the owning organization's authenticated dashboard. organizationId is
// denormalized from the business for simple tenant-scoped queries.
export const privateFeedbackTable = pgTable(
  "private_feedback",
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
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaignsTable.id, { onDelete: "cascade" }),
    // The client-generated review session id, kept only to correlate with
    // review_sessions for support/debugging; not a foreign key since a
    // session row is not guaranteed to exist yet at feedback time.
    sessionId: text("session_id"),
    rating: integer("rating").notNull(),
    message: text("message").notNull(),
    contact: text("contact"),
    language: text("language").notNull().default("en"),
    status: privateFeedbackStatusEnum("status").notNull().default("NEW"),
    spamFlag: boolean("spam_flag").notNull().default(false),
    spamReason: text("spam_reason"),
    alertDeliveryStatus: notificationDeliveryStatusEnum("alert_delivery_status"),
    alertDeliveryError: text("alert_delivery_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("private_feedback_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("private_feedback_business_id_idx").on(table.businessId),
  ],
);

export type PrivateFeedback = typeof privateFeedbackTable.$inferSelect;
