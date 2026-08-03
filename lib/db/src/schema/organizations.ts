import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const organizationStatusEnum = pgEnum("organization_status", [
  "ACTIVE",
  "SUSPENDED",
]);

export const organizationPlanEnum = pgEnum("organization_plan", [
  "STARTER",
  "GROWTH",
  "PRO",
  "ENTERPRISE",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);

// A tenant on the platform. Every Business, Campaign, QR code, and NFC
// device (added in later sprints) will belong to exactly one Organization.
// Subscription/billing fields are populated manually by a Super Admin for
// now (no payment integration in the MVP) but are shaped so a future
// Stripe integration can populate them without a schema change.
export const organizationsTable = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: organizationStatusEnum("status").notNull().default("ACTIVE"),
  plan: organizationPlanEnum("plan").notNull().default("STARTER"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("TRIALING"),
  aiQuota: integer("ai_quota").notNull().default(50),
  businessesLimit: integer("businesses_limit").notNull().default(1),
  startDate: timestamp("start_date", { withTimezone: true }),
  renewalDate: timestamp("renewal_date", { withTimezone: true }),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(
  organizationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
