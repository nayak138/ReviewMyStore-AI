import { pgEnum, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const accountDataExportStatusEnum = pgEnum("account_data_export_status", [
  "ISSUED",
  "EXPIRED",
]);

/**
 * Audit trail for account-only exports. The JSON is generated for the
 * authenticated request and is never persisted; this row records who asked,
 * when it was issued, and when its short retention window ends.
 */
export const accountDataExportsTable = pgTable(
  "account_data_exports",
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
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: accountDataExportStatusEnum("status").notNull().default("ISSUED"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_data_exports_user_id_idx").on(table.userId),
    index("account_data_exports_expires_at_idx").on(table.expiresAt),
  ],
);

export type AccountDataExport = typeof accountDataExportsTable.$inferSelect;