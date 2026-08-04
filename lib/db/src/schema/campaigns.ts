import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";

// Draft: created but not yet shown on any public review page.
// Active: live — its public review page (and any keywords under it) is
//   reachable by customers.
// Archived: hidden from the active list but restorable, mirroring the
//   Business archive/restore pattern.
// Disabled: owner-initiated kill switch, distinct from Archived so a
//   temporarily-paused campaign can be told apart from one being retired.
export const campaignStatusEnum = pgEnum("campaign_status", [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
  "DISABLED",
]);

// A Campaign is a single request-a-review "surface" for a Business (e.g. a
// table tent QR code or an NFC tag at checkout). It owns a set of Keywords
// customers can pick from on the public review page at
// /review/:businessSlug/:campaignSlug.
//
// The slug is unique per Business (not globally) since the public URL is
// already namespaced by businessSlug.
export const campaignsTable = pgTable(
  "campaigns",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    // Free-text template identifier (e.g. "restaurant_table",
    // "salon_reception", "custom") — informational only, does not gate
    // behavior.
    type: text("type").notNull().default("custom"),
    status: campaignStatusEnum("status").notNull().default("DRAFT"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("campaigns_business_id_idx").on(table.businessId),
    index("campaigns_business_id_slug_idx").on(table.businessId, table.slug),
  ],
);

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true,
  businessId: true,
  slug: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
