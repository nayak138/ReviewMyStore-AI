import { pool } from "@workspace/db";

type EnumRow = {
  enum_name: string;
  labels: string[];
};

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
};

const expectedEnums = new Map<string, string[]>([
  ["user_role", ["SUPER_ADMIN", "OWNER", "TEAM_MEMBER"]],
  ["team_permission", ["NONE", "VIEW", "MANAGE"]],
  ["analytics_permission", ["NONE", "VIEW"]],
  ["team_invitation_status", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]],
]);

const requiredColumns = [
  ["users", "role", "USER-DEFINED", "user_role", "NO"],
  ["business_memberships", "id", "text", "text", "NO"],
  ["business_memberships", "organization_id", "text", "text", "NO"],
  ["business_memberships", "business_id", "text", "text", "NO"],
  ["business_memberships", "user_id", "text", "text", "NO"],
  ["business_memberships", "campaigns_permission", "USER-DEFINED", "team_permission", "NO"],
  ["business_memberships", "review_inbox_permission", "USER-DEFINED", "team_permission", "NO"],
  ["business_memberships", "feedback_permission", "USER-DEFINED", "team_permission", "NO"],
  ["business_memberships", "social_media_permission", "USER-DEFINED", "team_permission", "NO"],
  ["business_memberships", "analytics_permission", "USER-DEFINED", "analytics_permission", "NO"],
  ["business_memberships", "removed_at", "timestamp with time zone", "timestamptz", "YES"],
  ["business_memberships", "created_at", "timestamp with time zone", "timestamptz", "NO"],
  ["business_memberships", "updated_at", "timestamp with time zone", "timestamptz", "NO"],
  ["team_invitations", "id", "text", "text", "NO"],
  ["team_invitations", "organization_id", "text", "text", "NO"],
  ["team_invitations", "business_id", "text", "text", "NO"],
  ["team_invitations", "invited_by_user_id", "text", "text", "NO"],
  ["team_invitations", "email", "text", "text", "NO"],
  ["team_invitations", "invited_name", "text", "text", "YES"],
  ["team_invitations", "token_hash", "text", "text", "NO"],
  ["team_invitations", "status", "USER-DEFINED", "team_invitation_status", "NO"],
  ["team_invitations", "campaigns_permission", "USER-DEFINED", "team_permission", "NO"],
  ["team_invitations", "review_inbox_permission", "USER-DEFINED", "team_permission", "NO"],
  ["team_invitations", "feedback_permission", "USER-DEFINED", "team_permission", "NO"],
  ["team_invitations", "social_media_permission", "USER-DEFINED", "team_permission", "NO"],
  ["team_invitations", "analytics_permission", "USER-DEFINED", "analytics_permission", "NO"],
  ["team_invitations", "expires_at", "timestamp with time zone", "timestamptz", "NO"],
  ["team_invitations", "accepted_at", "timestamp with time zone", "timestamptz", "YES"],
  ["team_invitations", "revoked_at", "timestamp with time zone", "timestamptz", "YES"],
  ["team_invitations", "delivery_status", "text", "text", "NO"],
  ["team_invitations", "delivery_error", "text", "text", "YES"],
  ["team_invitations", "last_resent_at", "timestamp with time zone", "timestamptz", "YES"],
  ["team_invitations", "created_at", "timestamp with time zone", "timestamptz", "NO"],
  ["team_invitations", "updated_at", "timestamp with time zone", "timestamptz", "NO"],
  ["team_audit_events", "id", "text", "text", "NO"],
  ["team_audit_events", "organization_id", "text", "text", "NO"],
  ["team_audit_events", "business_id", "text", "text", "YES"],
  ["team_audit_events", "actor_user_id", "text", "text", "YES"],
  ["team_audit_events", "target_user_id", "text", "text", "YES"],
  ["team_audit_events", "invitation_id", "text", "text", "YES"],
  ["team_audit_events", "event_type", "text", "text", "NO"],
  ["team_audit_events", "metadata", "jsonb", "jsonb", "YES"],
  ["team_audit_events", "created_at", "timestamp with time zone", "timestamptz", "NO"],
] as const;

export const TEAM_SCHEMA_NOT_READY_CODE = "TEAM_SCHEMA_NOT_READY";

export class TeamSchemaNotReadyError extends Error {
  readonly status = 503;
  readonly code = TEAM_SCHEMA_NOT_READY_CODE;

  constructor() {
    super(
      "Team access and invitations are temporarily unavailable. A platform administrator must complete the team database rollout before teammate access can be enabled.",
    );
    this.name = "TeamSchemaNotReadyError";
  }
}

type ReadinessProbe = () => Promise<boolean>;
let readinessProbeOverride: ReadinessProbe | undefined;

/**
 * This hook is only used by server-side tests to exercise the fail-closed
 * branch without changing the database schema.
 */
export function setTeamSchemaReadinessProbeForTests(
  probe: ReadinessProbe | undefined,
) {
  readinessProbeOverride = probe;
}

async function queryTeamSchemaReadiness(): Promise<boolean> {
  try {
    const enumResult = await pool.query<EnumRow>(`
      SELECT t.typname AS enum_name,
             array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] AS labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('user_role', 'team_permission', 'analytics_permission', 'team_invitation_status')
      GROUP BY t.typname
    `);
    const enums = new Map(
      enumResult.rows.map((row) => [row.enum_name, row.labels]),
    );
    for (const [name, labels] of expectedEnums) {
      if (JSON.stringify(enums.get(name)) !== JSON.stringify(labels)) {
        return false;
      }
    }

    const columnResult = await pool.query<ColumnRow>(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          table_name IN ('business_memberships', 'team_invitations', 'team_audit_events')
          OR (table_name = 'users' AND column_name = 'role')
        )
    `);
    const columns = new Map(
      columnResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
    );
    for (const [table, column, dataType, udtName, nullable] of requiredColumns) {
      const row = columns.get(`${table}.${column}`);
      if (
        !row ||
        row.data_type !== dataType ||
        row.udt_name !== udtName ||
        row.is_nullable !== nullable
      ) {
        return false;
      }
    }
    return true;
  } catch {
    // A missing database object or an unavailable catalog must never expose
    // team access. The caller returns a stable response without SQL details.
    return false;
  }
}

export async function isTeamSchemaReady(): Promise<boolean> {
  return readinessProbeOverride
    ? readinessProbeOverride()
    : queryTeamSchemaReadiness();
}

export async function assertTeamSchemaReady(): Promise<void> {
  if (!(await isTeamSchemaReady())) {
    throw new TeamSchemaNotReadyError();
  }
}