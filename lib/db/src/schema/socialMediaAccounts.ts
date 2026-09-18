import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { businessesTable } from "./businesses";

export const socialMediaPlatformEnum = pgEnum("social_media_platform", [
  "FACEBOOK",
  "INSTAGRAM",
  "THREADS",
]);

export const socialMediaAccountStatusEnum = pgEnum("social_media_account_status", [
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
]);

/**
 * Business-scoped references to accounts connected through bundle.social.
 * OAuth credentials stay with bundle.social; this table only stores the
 * provider account identifier and display metadata needed by the workspace.
 */
export const socialMediaAccountsTable = pgTable(
  "social_media_accounts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    platform: socialMediaPlatformEnum("platform").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    displayName: text("display_name").notNull(),
    username: text("username"),
    profileUrl: text("profile_url"),
    status: socialMediaAccountStatusEnum("status").notNull().default("CONNECTED"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("social_media_accounts_business_platform_external_idx").on(
      table.businessId,
      table.platform,
      table.externalAccountId,
    ),
    index("social_media_accounts_organization_id_idx").on(table.organizationId),
    index("social_media_accounts_business_id_idx").on(table.businessId),
  ],
);

export const insertSocialMediaAccountSchema = createInsertSchema(
  socialMediaAccountsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSocialMediaAccount = z.infer<
  typeof insertSocialMediaAccountSchema
>;
export type SocialMediaAccount = typeof socialMediaAccountsTable.$inferSelect;