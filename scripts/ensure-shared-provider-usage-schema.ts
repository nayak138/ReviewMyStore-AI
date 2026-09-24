import { pool } from "@workspace/db";

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "shared_provider_usage_periods" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "provider_account" text NOT NULL,
      "metric" text NOT NULL,
      "period_start" timestamp with time zone NOT NULL,
      "period_end" timestamp with time zone NOT NULL,
      "limit" integer NOT NULL,
      "used" integer DEFAULT 0 NOT NULL,
      "reserved" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "shared_provider_usage_reservations" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "provider_account" text NOT NULL,
      "metric" text NOT NULL,
      "period_start" timestamp with time zone NOT NULL,
      "amount" integer NOT NULL,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "shared_provider_usage_periods_account_metric_start_idx"
      ON "shared_provider_usage_periods" USING btree ("provider_account", "metric", "period_start");
    CREATE INDEX IF NOT EXISTS "shared_provider_usage_reservations_period_start_idx"
      ON "shared_provider_usage_reservations" USING btree ("provider_account", "metric", "period_start");
    CREATE INDEX IF NOT EXISTS "shared_provider_usage_reservations_status_idx"
      ON "shared_provider_usage_reservations" USING btree ("status", "updated_at");
  `);
  console.log("Shared provider usage schema is applied to the development database.");
} finally {
  await pool.end();
}