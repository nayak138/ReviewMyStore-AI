import { pool } from "@workspace/db";

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "social_media_provider_teams" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" text NOT NULL
        REFERENCES "organizations"("id") ON DELETE cascade,
      "business_id" text NOT NULL
        REFERENCES "businesses"("id") ON DELETE cascade,
      "external_team_id" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "social_media_provider_teams_business_idx"
      ON "social_media_provider_teams" ("business_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "social_media_provider_teams_external_team_idx"
      ON "social_media_provider_teams" ("external_team_id");
    CREATE INDEX IF NOT EXISTS "social_media_provider_teams_organization_id_idx"
      ON "social_media_provider_teams" ("organization_id");
  `);
} finally {
  await pool.end();
}