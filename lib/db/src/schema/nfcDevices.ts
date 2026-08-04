import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { businessesTable } from "./businesses";
import { campaignsTable } from "./campaigns";

// Available: registered but not linked to any campaign.
// Assigned: linked to a campaign but not yet confirmed live in the field.
// Active: assigned and live — taps are expected and counted.
// Disabled: kill switch; the device's redirect link stops resolving.
export const nfcDeviceStatusEnum = pgEnum("nfc_device_status", [
  "AVAILABLE",
  "ASSIGNED",
  "ACTIVE",
  "DISABLED",
]);

// A physical NFC tag/standee tracked in software only (no hardware writing in
// this sprint). The UID is whatever identifier is printed on / read from the
// physical tag; it is unique within an Organization, not globally, since two
// tenants could plausibly own tags from the same batch.
export const nfcDevicesTable = pgTable(
  "nfc_devices",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    uid: text("uid").notNull(),
    name: text("name").notNull(),
    businessId: text("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    campaignId: text("campaign_id").references(() => campaignsTable.id, {
      onDelete: "set null",
    }),
    status: nfcDeviceStatusEnum("status").notNull().default("AVAILABLE"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("nfc_devices_org_uid_idx").on(table.organizationId, table.uid),
    index("nfc_devices_organization_id_idx").on(table.organizationId),
    index("nfc_devices_campaign_id_idx").on(table.campaignId),
  ],
);

export const insertNfcDeviceSchema = createInsertSchema(nfcDevicesTable).omit({
  id: true,
  organizationId: true,
  businessId: true,
  campaignId: true,
  status: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNfcDevice = z.infer<typeof insertNfcDeviceSchema>;
export type NfcDevice = typeof nfcDevicesTable.$inferSelect;
