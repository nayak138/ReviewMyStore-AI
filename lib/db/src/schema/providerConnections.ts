import {
  index,
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
    provider: reviewProviderEnum("provider").notNull().default("BNDLE"),
    externalProfileId: text("external_profile_id").notNull(),
    status: reviewConnectionStatusEnum("status").notNull().default("PENDING"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_connections_org_provider_idx").on(
      table.organizationId,
      table.provider,
    ),
    index("provider_connections_organization_id_idx").on(table.organizationId),
  ],
);

export const insertProviderConnectionSchema = createInsertSchema(
  providerConnectionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
  lastError: true,
});
export type InsertProviderConnection = z.infer<
  typeof insertProviderConnectionSchema
>;
export type ProviderConnection = typeof providerConnectionsTable.$inferSelect;