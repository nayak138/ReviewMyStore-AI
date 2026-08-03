import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";

// Active: operates normally, public review pages (added in a later sprint) are live.
// Suspended: owner can still log in and the business stays visible in the dashboard,
//   but its public review pages will be disabled once they exist (later sprint).
// Disabled: reserved for future implementation (no behavior defined yet).
export const businessStatusEnum = pgEnum("business_status", [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
]);

// A single storefront/location owned by an Organization. Every Business
// belongs to exactly one Organization; RBAC (enforced in the service layer,
// not just the route) must always scope queries by the caller's
// organizationId so tenants can never read or mutate each other's rows.
//
// googlePlaceId is a free-text field for MVP manual entry. It is stored as
// its own plain column (not nested/derived) specifically so a future Google
// Places Search API integration can populate/validate it without changing
// the Business model or migrating data.
//
// Soft delete vs. archive are distinct, independent states:
// - deletedAt set -> soft-deleted, excluded from all normal reads.
// - archivedAt set -> archived, excluded from the active list but still
//   restorable and not considered "deleted".
export const businessesTable = pgTable(
  "businesses",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    googlePlaceId: text("google_place_id"),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    brandColor: text("brand_color"),
    welcomeMessage: text("welcome_message"),
    status: businessStatusEnum("status").notNull().default("ACTIVE"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("businesses_organization_id_idx").on(table.organizationId)],
);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  organizationId: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
