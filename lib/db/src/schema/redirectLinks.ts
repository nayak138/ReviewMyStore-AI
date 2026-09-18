import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { campaignsTable } from "./campaigns";

export const redirectSourceEnum = pgEnum("redirect_source", ["QR"]);

// A short-code redirect target for a campaign QR code. Resolution happens at
// scan time so campaign edits and slug changes do not invalidate printed codes.
export const redirectLinksTable = pgTable(
  "redirect_links",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    sourceType: redirectSourceEnum("source_type").notNull(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaignsTable.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("redirect_links_code_idx").on(table.code),
    index("redirect_links_campaign_id_idx").on(table.campaignId),
    // DB-enforced link identity: exactly one QR link per campaign.
    uniqueIndex("redirect_links_qr_campaign_uniq")
      .on(table.campaignId)
      .where(sql`${table.sourceType} = 'QR'`),
  ],
);

export type RedirectLink = typeof redirectLinksTable.$inferSelect;
