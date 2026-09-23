import { pool } from "@workspace/db";

try {
  await pool.query(`
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';

    DO $$
    BEGIN
      CREATE TYPE "team_permission" AS ENUM ('NONE', 'VIEW', 'MANAGE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TYPE "team_permission" ADD VALUE IF NOT EXISTS 'NONE';
    ALTER TYPE "team_permission" ADD VALUE IF NOT EXISTS 'VIEW';
    ALTER TYPE "team_permission" ADD VALUE IF NOT EXISTS 'MANAGE';

    DO $$
    BEGIN
      CREATE TYPE "analytics_permission" AS ENUM ('NONE', 'VIEW');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TYPE "analytics_permission" ADD VALUE IF NOT EXISTS 'NONE';
    ALTER TYPE "analytics_permission" ADD VALUE IF NOT EXISTS 'VIEW';

    DO $$
    BEGIN
      CREATE TYPE "team_invitation_status" AS ENUM (
        'PENDING',
        'ACCEPTED',
        'REVOKED',
        'EXPIRED'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TYPE "team_invitation_status" ADD VALUE IF NOT EXISTS 'PENDING';
    ALTER TYPE "team_invitation_status" ADD VALUE IF NOT EXISTS 'ACCEPTED';
    ALTER TYPE "team_invitation_status" ADD VALUE IF NOT EXISTS 'REVOKED';
    ALTER TYPE "team_invitation_status" ADD VALUE IF NOT EXISTS 'EXPIRED';

    CREATE TABLE IF NOT EXISTS "business_memberships" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" text NOT NULL
        CONSTRAINT "business_memberships_organization_id_organizations_id_fk"
        REFERENCES "organizations"("id") ON DELETE cascade,
      "business_id" text NOT NULL
        CONSTRAINT "business_memberships_business_id_businesses_id_fk"
        REFERENCES "businesses"("id") ON DELETE cascade,
      "user_id" text NOT NULL
        CONSTRAINT "business_memberships_user_id_users_id_fk"
        REFERENCES "users"("id") ON DELETE cascade,
      "campaigns_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "review_inbox_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "feedback_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "social_media_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "analytics_permission" "analytics_permission" DEFAULT 'NONE' NOT NULL,
      "removed_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "business_memberships_business_user_uidx"
      ON "business_memberships" ("business_id", "user_id");
    CREATE INDEX IF NOT EXISTS "business_memberships_organization_idx"
      ON "business_memberships" ("organization_id");
    CREATE INDEX IF NOT EXISTS "business_memberships_user_idx"
      ON "business_memberships" ("user_id");

    CREATE TABLE IF NOT EXISTS "team_invitations" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" text NOT NULL
        CONSTRAINT "team_invitations_organization_id_organizations_id_fk"
        REFERENCES "organizations"("id") ON DELETE cascade,
      "business_id" text NOT NULL
        CONSTRAINT "team_invitations_business_id_businesses_id_fk"
        REFERENCES "businesses"("id") ON DELETE cascade,
      "invited_by_user_id" text NOT NULL
        CONSTRAINT "team_invitations_invited_by_user_id_users_id_fk"
        REFERENCES "users"("id") ON DELETE restrict,
      "email" text NOT NULL,
      "invited_name" text,
      "token_hash" text NOT NULL
        CONSTRAINT "team_invitations_token_hash_unique" UNIQUE,
      "status" "team_invitation_status" DEFAULT 'PENDING' NOT NULL,
      "campaigns_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "review_inbox_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "feedback_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "social_media_permission" "team_permission" DEFAULT 'NONE' NOT NULL,
      "analytics_permission" "analytics_permission" DEFAULT 'NONE' NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "accepted_at" timestamp with time zone,
      "revoked_at" timestamp with time zone,
      "delivery_status" text DEFAULT 'NOT_SENT' NOT NULL,
      "delivery_error" text,
      "last_resent_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "team_invitations_business_idx"
      ON "team_invitations" ("business_id");
    CREATE INDEX IF NOT EXISTS "team_invitations_organization_idx"
      ON "team_invitations" ("organization_id");
    CREATE INDEX IF NOT EXISTS "team_invitations_email_idx"
      ON "team_invitations" ("email");
    CREATE UNIQUE INDEX IF NOT EXISTS "team_invitations_pending_email_business_uidx"
      ON "team_invitations" ("business_id", "email", "status");

    CREATE TABLE IF NOT EXISTS "team_audit_events" (
      "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "organization_id" text NOT NULL
        CONSTRAINT "team_audit_events_organization_id_organizations_id_fk"
        REFERENCES "organizations"("id") ON DELETE cascade,
      "business_id" text
        CONSTRAINT "team_audit_events_business_id_businesses_id_fk"
        REFERENCES "businesses"("id") ON DELETE set null,
      "actor_user_id" text
        CONSTRAINT "team_audit_events_actor_user_id_users_id_fk"
        REFERENCES "users"("id") ON DELETE set null,
      "target_user_id" text
        CONSTRAINT "team_audit_events_target_user_id_users_id_fk"
        REFERENCES "users"("id") ON DELETE set null,
      "invitation_id" text,
      "event_type" text NOT NULL,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );

    DO $$
    DECLARE
      rename_row RECORD;
    BEGIN
      FOR rename_row IN
        SELECT *
        FROM (
          VALUES
            ('business_memberships', 'business_memberships_organization_id_fkey', 'business_memberships_organization_id_organizations_id_fk'),
            ('business_memberships', 'business_memberships_business_id_fkey', 'business_memberships_business_id_businesses_id_fk'),
            ('business_memberships', 'business_memberships_user_id_fkey', 'business_memberships_user_id_users_id_fk'),
            ('team_invitations', 'team_invitations_organization_id_fkey', 'team_invitations_organization_id_organizations_id_fk'),
            ('team_invitations', 'team_invitations_business_id_fkey', 'team_invitations_business_id_businesses_id_fk'),
            ('team_invitations', 'team_invitations_invited_by_user_id_fkey', 'team_invitations_invited_by_user_id_users_id_fk'),
            ('team_audit_events', 'team_audit_events_organization_id_fkey', 'team_audit_events_organization_id_organizations_id_fk'),
            ('team_audit_events', 'team_audit_events_business_id_fkey', 'team_audit_events_business_id_businesses_id_fk'),
            ('team_audit_events', 'team_audit_events_actor_user_id_fkey', 'team_audit_events_actor_user_id_users_id_fk'),
            ('team_audit_events', 'team_audit_events_target_user_id_fkey', 'team_audit_events_target_user_id_users_id_fk')
        ) AS renames(table_name, old_name, new_name)
      LOOP
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass(format('public.%I', rename_row.table_name))
            AND conname = rename_row.old_name
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = to_regclass(format('public.%I', rename_row.table_name))
            AND conname = rename_row.new_name
        ) THEN
          EXECUTE format(
            'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
            rename_row.table_name,
            rename_row.old_name,
            rename_row.new_name
          );
        END IF;
      END LOOP;
    END $$;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_class i
        JOIN pg_namespace n ON n.oid = i.relnamespace
        WHERE n.nspname = 'public'
          AND i.relname = 'team_invitations_token_hash_unique'
          AND i.relkind = 'i'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'team_invitations'
          AND c.conname = 'team_invitations_token_hash_unique'
      ) THEN
        ALTER INDEX "team_invitations_token_hash_unique"
          RENAME TO "team_invitations_token_hash_unique_idx";
        ALTER TABLE "team_invitations"
          ADD CONSTRAINT "team_invitations_token_hash_unique"
          UNIQUE USING INDEX "team_invitations_token_hash_unique_idx";
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "team_audit_events_business_created_idx"
      ON "team_audit_events" ("business_id", "created_at");
    CREATE INDEX IF NOT EXISTS "team_audit_events_organization_idx"
      ON "team_audit_events" ("organization_id");
  `);
  console.log("Additive team schema is applied to the development database.");
} finally {
  await pool.end();
}