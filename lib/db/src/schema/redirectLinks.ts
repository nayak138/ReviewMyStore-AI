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
import { nfcDevicesTable } from "./nfcDevices";

// The physical surface a redirect code is printed on / written to.
export const redirectSourceEnum = pgEnum("redirect_source", ["QR", "NFC"]);

// A short-code redirect target: every QR code and NFC device points at
// /r/{code} instead of directly at the review page, so the destination can
// change later (campaign edits, slug changes) without reprinting anything,
// and so every hit can be logged as a scan event.
//
// - QR links: exactly one per campaign (lazily created on first QR request).
// - NFC links: one per NFC device (created when the device is assigned).
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
    nfcDeviceId: text("nfc_device_id").references(() => nfcDevicesTable.id, {
      onDelete: "cascade",
    }),
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
    index("redirect_links_nfc_device_id_idx").on(table.nfcDeviceId),
    // DB-enforced link identity: exactly one QR link per campaign, exactly
    // one link per NFC device — concurrent ensure* calls can't duplicate.
    uniqueIndex("redirect_links_qr_campaign_uniq")
      .on(table.campaignId)
      .where(sql`${table.sourceType} = 'QR'`),
    uniqueIndex("redirect_links_nfc_device_uniq")
      .on(table.nfcDeviceId)
      .where(sql`${table.nfcDeviceId} is not null`),
  ],
);

export type RedirectLink = typeof redirectLinksTable.$inferSelect;
