import { index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const teamPermissionEnum = pgEnum("team_permission", [
  "NONE",
  "VIEW",
  "MANAGE",
]);

export const analyticsPermissionEnum = pgEnum("analytics_permission", [
  "NONE",
  "VIEW",
]);

export const businessMembershipsTable = pgTable(
  "business_memberships",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    campaignsPermission: teamPermissionEnum("campaigns_permission")
      .notNull()
      .default("NONE"),
    reviewInboxPermission: teamPermissionEnum("review_inbox_permission")
      .notNull()
      .default("NONE"),
    feedbackPermission: teamPermissionEnum("feedback_permission")
      .notNull()
      .default("NONE"),
    socialMediaPermission: teamPermissionEnum("social_media_permission")
      .notNull()
      .default("NONE"),
    analyticsPermission: analyticsPermissionEnum("analytics_permission")
      .notNull()
      .default("NONE"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("business_memberships_business_user_uidx").on(
      table.businessId,
      table.userId,
    ),
    index("business_memberships_organization_idx").on(table.organizationId),
    index("business_memberships_user_idx").on(table.userId),
  ],
);

export type BusinessMembership = typeof businessMembershipsTable.$inferSelect;