import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

/**
 * An organization-scoped lease for provider mutations. It replaces a
 * long-held PostgreSQL session lock, so outbound provider work never consumes
 * a shared application-pool connection. An expired lease can be reclaimed
 * after a process crash; leaseToken prevents a previous holder from deleting
 * a successor's lease.
 */
export const reviewProviderOperationLeasesTable = pgTable(
  "review_provider_operation_leases",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    leaseToken: text("lease_token")
      .notNull()
      .default(sql`gen_random_uuid()`),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_provider_operation_leases_expires_at_idx").on(
      table.expiresAt,
    ),
  ],
);

export const insertReviewProviderOperationLeaseSchema = createInsertSchema(
  reviewProviderOperationLeasesTable,
).omit({
  acquiredAt: true,
  updatedAt: true,
});

export type InsertReviewProviderOperationLease = z.infer<
  typeof insertReviewProviderOperationLeaseSchema
>;
export type ReviewProviderOperationLease =
  typeof reviewProviderOperationLeasesTable.$inferSelect;
