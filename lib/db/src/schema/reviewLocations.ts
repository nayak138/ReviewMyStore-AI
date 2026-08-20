import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { providerConnectionsTable } from "./providerConnections";
import { businessesTable } from "./businesses";

/** Provider locations are separate from app Businesses until an owner chooses
 * to map them. This supports one Google manager account with many locations. */
export const reviewLocationsTable = pgTable(
  "review_locations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    providerConnectionId: text("provider_connection_id")
      .notNull()
      .references(() => providerConnectionsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    externalAccountId: text("external_account_id").notNull(),
    externalLocationId: text("external_location_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    category: text("category"),
    websiteUrl: text("website_url"),
    isSelected: boolean("is_selected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("review_locations_connection_external_idx").on(
      table.providerConnectionId,
      table.externalLocationId,
    ),
    index("review_locations_organization_id_idx").on(table.organizationId),
  ],
);

export const insertReviewLocationSchema = createInsertSchema(
  reviewLocationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReviewLocation = z.infer<typeof insertReviewLocationSchema>;
export type ReviewLocation = typeof reviewLocationsTable.$inferSelect;