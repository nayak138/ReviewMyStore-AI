import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Binds a presigned upload to the authenticated Clerk user until the upload
 * is finalized. The object path alone is never treated as proof of ownership.
 */
export const objectUploadsTable = pgTable(
  "object_uploads",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    objectPath: text("object_path").notNull(),
    ownerClerkUserId: text("owner_clerk_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("object_uploads_object_path_idx").on(table.objectPath)],
);

export type ObjectUpload = typeof objectUploadsTable.$inferSelect;