import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businessesTable } from "./businesses";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import {
  analyticsPermissionEnum,
  teamPermissionEnum,
} from "./businessMemberships";

export const teamInvitationStatusEnum = pgEnum("team_invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED",
]);

export const teamInvitationsTable = pgTable(
  "team_invitations",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    invitedName: text("invited_name"),
    tokenHash: text("token_hash").notNull().unique(),
    status: teamInvitationStatusEnum("status").notNull().default("PENDING"),
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
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    deliveryStatus: text("delivery_status").notNull().default("NOT_SENT"),
    deliveryError: text("delivery_error"),
    lastResentAt: timestamp("last_resent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_invitations_business_idx").on(table.businessId),
    index("team_invitations_organization_idx").on(table.organizationId),
    index("team_invitations_email_idx").on(table.email),
    uniqueIndex("team_invitations_pending_email_business_uidx").on(
      table.businessId,
      table.email,
      table.status,
    ),
  ],
);

export type TeamInvitation = typeof teamInvitationsTable.$inferSelect;