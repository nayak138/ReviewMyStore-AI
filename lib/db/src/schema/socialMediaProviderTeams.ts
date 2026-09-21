import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";
import { organizationsTable } from "./organizations";

/**
 * Business-scoped provider teams used by social publishing.
 *
 * Review management intentionally keeps its organization-scoped provider
 * connection in providerConnectionsTable. Social channels are different:
 * bundle.social stores one selected channel per platform per team, so every
 * business needs its own team to prevent channel changes from leaking across
 * businesses in the same organization.
 */
export const socialMediaProviderTeamsTable = pgTable(
  "social_media_provider_teams",
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
    externalTeamId: text("external_team_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("social_media_provider_teams_business_idx").on(table.businessId),
    uniqueIndex("social_media_provider_teams_external_team_idx").on(
      table.externalTeamId,
    ),
    index("social_media_provider_teams_organization_id_idx").on(
      table.organizationId,
    ),
  ],
);

export const insertSocialMediaProviderTeamSchema = createInsertSchema(
  socialMediaProviderTeamsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSocialMediaProviderTeam = z.infer<
  typeof insertSocialMediaProviderTeamSchema
>;
export type SocialMediaProviderTeam =
  typeof socialMediaProviderTeamsTable.$inferSelect;