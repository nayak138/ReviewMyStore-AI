import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production") {
  throw new Error("API test schema setup is development-only.");
}

try {
  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE "notification_delivery_status" AS ENUM (
        'PENDING',
        'SENT',
        'PARTIAL',
        'FAILED',
        'SKIPPED'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await pool.query(`
    ALTER TYPE "notification_delivery_status" ADD VALUE IF NOT EXISTS 'PENDING';
    ALTER TYPE "notification_delivery_status" ADD VALUE IF NOT EXISTS 'SENT';
    ALTER TYPE "notification_delivery_status" ADD VALUE IF NOT EXISTS 'PARTIAL';
    ALTER TYPE "notification_delivery_status" ADD VALUE IF NOT EXISTS 'FAILED';
    ALTER TYPE "notification_delivery_status" ADD VALUE IF NOT EXISTS 'SKIPPED';
  `);

  await pool.query(`
    ALTER TABLE "private_feedback"
      ADD COLUMN IF NOT EXISTS "alert_delivery_status" "notification_delivery_status",
      ADD COLUMN IF NOT EXISTS "alert_delivery_error" text;

    ALTER TABLE "demo_requests"
      ADD COLUMN IF NOT EXISTS "alert_delivery_status" "notification_delivery_status",
      ADD COLUMN IF NOT EXISTS "alert_delivery_error" text;

    ALTER TABLE "businesses"
      ADD COLUMN IF NOT EXISTS "quoted_monthly_base_amount_cents" integer,
      ADD COLUMN IF NOT EXISTS "quoted_monthly_currency" text DEFAULT 'USD' NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "business_social_comments" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" text NOT NULL
        CONSTRAINT "business_social_comments_organization_id_organizations_id_fk"
        REFERENCES "organizations"("id") ON DELETE cascade,
      "business_id" text NOT NULL
        CONSTRAINT "business_social_comments_business_id_businesses_id_fk"
        REFERENCES "businesses"("id") ON DELETE cascade,
      "provider_comment_id" text NOT NULL,
      "provider_post_id" text,
      "imported_at" timestamp with time zone DEFAULT now() NOT NULL,
      "replied_at" timestamp with time zone,
      "reply_reservation_id" text
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "business_social_comments_business_provider_id_idx"
      ON "business_social_comments" ("business_id", "provider_comment_id");
    CREATE INDEX IF NOT EXISTS "business_social_comments_organization_id_idx"
      ON "business_social_comments" ("organization_id");
  `);

  console.log(
    "API test schema is ready in the development database.",
  );
} finally {
  await pool.end();
}