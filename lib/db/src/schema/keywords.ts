import { pgTable, text, timestamp, pgEnum, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { campaignsTable } from "./campaigns";

// Product/Service: what the customer bought or used (e.g. "Iced Latte",
// "Haircut"). Experience: how the visit felt (e.g. "Friendly Staff",
// "Fast Service"). This split is shown to customers as two labeled groups on
// the public review page.
export const keywordCategoryEnum = pgEnum("keyword_category", [
  "PRODUCT_SERVICE",
  "EXPERIENCE",
]);

// A single selectable chip on a Campaign's public review page. Order and
// enabled state are owner-controlled; disabled keywords are kept (not
// deleted) so re-enabling doesn't lose the label.
export const keywordsTable = pgTable(
  "keywords",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaignsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    category: keywordCategoryEnum("category").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("keywords_campaign_id_idx").on(table.campaignId)],
);

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({
  id: true,
  campaignId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;
