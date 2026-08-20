import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { reviewLocationsTable } from "./reviewLocations";

export const reviewResponseStatusEnum = pgEnum("review_response_status", [
  "PENDING",
  "DRAFT",
  "PUBLISHED",
]);

export const managedReviewsTable = pgTable(
  "managed_reviews",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    reviewLocationId: text("review_location_id")
      .notNull()
      .references(() => reviewLocationsTable.id, { onDelete: "cascade" }),
    externalReviewId: text("external_review_id").notNull(),
    providerResourceName: text("provider_resource_name"),
    reviewerName: text("reviewer_name").notNull(),
    reviewerPhotoUrl: text("reviewer_photo_url"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    reviewCreatedAt: timestamp("review_created_at", { withTimezone: true }),
    reviewUpdatedAt: timestamp("review_updated_at", { withTimezone: true }),
    replyText: text("reply_text"),
    replyUpdatedAt: timestamp("reply_updated_at", { withTimezone: true }),
    draftReplyText: text("draft_reply_text"),
    draftGeneratedAt: timestamp("draft_generated_at", { withTimezone: true }),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    sensitiveReason: text("sensitive_reason"),
    responseStatus: reviewResponseStatusEnum("response_status")
      .notNull()
      .default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("managed_reviews_location_external_idx").on(
      table.reviewLocationId,
      table.externalReviewId,
    ),
    index("managed_reviews_org_status_idx").on(
      table.organizationId,
      table.responseStatus,
    ),
    index("managed_reviews_location_updated_idx").on(
      table.reviewLocationId,
      table.reviewUpdatedAt,
    ),
  ],
);

export const insertManagedReviewSchema = createInsertSchema(
  managedReviewsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertManagedReview = z.infer<typeof insertManagedReviewSchema>;
export type ManagedReview = typeof managedReviewsTable.$inferSelect;