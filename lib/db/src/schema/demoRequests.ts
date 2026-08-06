import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

// Lifecycle for a demo/lead request submitted from the public marketing site.
// NEW: just submitted, nobody has looked at it yet.
// CONTACTED: someone reached out to the prospect.
// CLOSED: handled (booked, converted, or discarded).
export const demoRequestStatusEnum = pgEnum("demo_request_status", [
  "NEW",
  "CONTACTED",
  "CLOSED",
]);

// A demo booking / sales lead captured from the public marketing page.
// Unauthenticated visitors create these, so every field is plain visitor
// input — never trust it and never link it to a User/Organization row.
export const demoRequestsTable = pgTable("demo_requests", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  locations: text("locations"),
  message: text("message"),
  status: demoRequestStatusEnum("status").notNull().default("NEW"),
  // Free-text admin notes about the lead (call summaries, follow-up dates).
  // Only ever written by SUPER_ADMIN via the admin API — never visitor input.
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDemoRequestSchema = createInsertSchema(
  demoRequestsTable,
).omit({
  id: true,
  status: true,
  notes: true,
  createdAt: true,
});
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;
export type DemoRequest = typeof demoRequestsTable.$inferSelect;
