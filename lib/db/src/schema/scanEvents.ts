import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { businessesTable } from "./businesses";
import { campaignsTable } from "./campaigns";
import { nfcDevicesTable } from "./nfcDevices";
import { redirectLinksTable } from "./redirectLinks";

// QR_SCAN / NFC_TAP: someone hit /r/{code} from a printed QR or an NFC tag.
// GOOGLE_REDIRECT: a customer clicked "Copy & Post to Google" on the public
//   review page (counted separately so the funnel end is measurable).
export const scanEventTypeEnum = pgEnum("scan_event_type", [
  "QR_SCAN",
  "NFC_TAP",
  "GOOGLE_REDIRECT",
]);

// Append-only analytics log. organizationId/businessId/campaignId are
// denormalized (with SET NULL on delete rather than CASCADE) so historical
// counts survive campaign/device deletion; org-scoped queries only need the
// organizationId column. Geo fields are best-effort from proxy headers and
// stay null when unavailable (e.g. local dev).
export const scanEventsTable = pgTable(
  "scan_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventType: scanEventTypeEnum("event_type").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    campaignId: text("campaign_id").references(() => campaignsTable.id, {
      onDelete: "set null",
    }),
    redirectLinkId: text("redirect_link_id").references(
      () => redirectLinksTable.id,
      { onDelete: "set null" },
    ),
    nfcDeviceId: text("nfc_device_id").references(() => nfcDevicesTable.id, {
      onDelete: "set null",
    }),
    // Denormalized names so Recent Activity / Top Campaigns render even after
    // the underlying campaign is deleted.
    businessName: text("business_name"),
    campaignName: text("campaign_name"),
    deviceType: text("device_type"),
    browser: text("browser"),
    os: text("os"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    referrer: text("referrer"),
    redirectSuccess: boolean("redirect_success").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("scan_events_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("scan_events_campaign_id_idx").on(table.campaignId),
  ],
);

export type ScanEvent = typeof scanEventsTable.$inferSelect;
