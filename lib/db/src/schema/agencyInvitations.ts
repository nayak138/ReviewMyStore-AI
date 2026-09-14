import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const agencyInvitationStatusEnum = pgEnum("agency_invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
]);

export const agencyInvitationsTable = pgTable(
  "agency_invitations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: agencyInvitationStatusEnum("status").notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("agency_invitations_email_idx").on(table.email),
    index("agency_invitations_organization_id_idx").on(table.organizationId),
  ],
);

export type AgencyInvitation = typeof agencyInvitationsTable.$inferSelect;