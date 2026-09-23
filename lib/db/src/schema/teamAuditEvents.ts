import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const teamAuditEventsTable = pgTable(
  "team_audit_events",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    targetUserId: text("target_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    invitationId: text("invitation_id"),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_audit_events_business_created_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("team_audit_events_organization_idx").on(table.organizationId),
  ],
);

export type TeamAuditEvent = typeof teamAuditEventsTable.$inferSelect;