import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { campaignsTable } from "./campaigns";

// Tracks the AI-regeneration cap (max 3) for one customer's visit to a
// public review page. The id is a client-generated opaque token (e.g. a
// UUID kept in sessionStorage for that page load) — there is no login, so
// this is the only handle the server has to rate-limit regenerations for a
// single customer. generationCount includes an in-flight reservation briefly;
// failed reservations are atomically rolled back by the service.
export const reviewSessionsTable = pgTable(
  "review_sessions",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaignsTable.id, { onDelete: "cascade" }),
    generationCount: integer("generation_count").notNull().default(0),
    lastReviewText: text("last_review_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("review_sessions_campaign_id_idx").on(table.campaignId)],
);

export type ReviewSession = typeof reviewSessionsTable.$inferSelect;
