import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";

export const userRoleEnum = pgEnum("user_role", ["SUPER_ADMIN", "OWNER"]);

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);

// A platform account, bridged to a Clerk identity. Auth (password, sessions,
// social login) is fully owned by Clerk; this table only stores the app-level
// profile and authorization role so RBAC and org-scoping are enforced by our
// own backend rather than the auth provider.
//
// organizationId is null for SUPER_ADMIN accounts, which are platform-wide
// and not scoped to a single tenant. Every OWNER must belong to exactly one
// Organization, auto-provisioned on their first authenticated request.
export const usersTable = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: text("organization_id").references(
    () => organizationsTable.id,
    { onDelete: "cascade" },
  ),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("OWNER"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
