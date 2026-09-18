import { pgEnum, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const accountDeactivationRequestStatusEnum = pgEnum(
  "account_deactivation_request_status",
  ["PENDING_REVIEW", "APPROVED", "REJECTED"],
);

export const accountDeactivationRequestsTable = pgTable(
  "account_deactivation_requests",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(
      () => organizationsTable.id,
      { onDelete: "set null" },
    ),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: accountDeactivationRequestStatusEnum("status")
      .notNull()
      .default("PENDING_REVIEW"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: text("reviewed_by_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    reviewerNote: text("reviewer_note"),
  },
  (table) => [
    index("account_deactivation_requests_user_id_idx").on(table.userId),
    index("account_deactivation_requests_status_idx").on(table.status),
    index("account_deactivation_requests_requested_at_idx").on(
      table.requestedAt,
    ),
  ],
);

export type AccountDeactivationRequest =
  typeof accountDeactivationRequestsTable.$inferSelect;