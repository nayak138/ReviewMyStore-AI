import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { businessesTable } from "./businesses";

/**
 * Local receipt for provider-fetched comments. This makes imported-comment
 * usage idempotent and prevents publishing more than one reply per comment.
 */
export const businessSocialCommentsTable = pgTable(
  "business_social_comments",
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
    providerCommentId: text("provider_comment_id").notNull(),
    providerPostId: text("provider_post_id"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    replyReservationId: text("reply_reservation_id"),
  },
  (table) => [
    uniqueIndex("business_social_comments_business_provider_id_idx").on(
      table.businessId,
      table.providerCommentId,
    ),
    index("business_social_comments_organization_id_idx").on(
      table.organizationId,
    ),
  ],
);

export type BusinessSocialComment =
  typeof businessSocialCommentsTable.$inferSelect;