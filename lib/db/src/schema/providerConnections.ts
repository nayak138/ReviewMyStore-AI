import {
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
import { businessesTable } from "./businesses";

export const reviewProviderEnum = pgEnum("review_provider", ["BNDLE"]);
export const reviewConnectionStatusEnum = pgEnum("review_connection_status", [
  "DISCONNECTED",
  "PENDING",
  "CONNECTED",
  "ERROR",
]);

/** A tenant-owned bridge to a third-party review provider. OAuth credentials
 * remain with the provider; we persist only the provider profile identifier. */
export const providerConnectionsTable = pgTable(
  "provider_connections",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    /** Business whose Google location is attached to this connection. */
    businessId: text("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    provider: reviewProviderEnum("provider").notNull().default("BNDLE"),
    externalProfileId: text("external_profile_id").notNull(),
    status: reviewConnectionStatusEnum("status").notNull().default("PENDING"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    /** Provider's remaining monthly review-import capacity for this account,
     * as of the last successful sync. Null until a sync reports it. */
    remainingImportCapacity: integer("remaining_import_capacity"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_connections_business_provider_idx").on(
      table.businessId,
      table.provider,
    ),
    index("provider_connections_organization_id_idx").on(table.organizationId),
    index("provider_connections_business_id_idx").on(table.businessId),
  ],
);

export const insertProviderConnectionSchema = createInsertSchema(
  providerConnectionsTable,
).omit({
  id: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
  lastError: true,
  remainingImportCapacity: true,
});
export type InsertProviderConnection = z.infer<
  typeof insertProviderConnectionSchema
>;
export type ProviderConnection = typeof providerConnectionsTable.$inferSelect;