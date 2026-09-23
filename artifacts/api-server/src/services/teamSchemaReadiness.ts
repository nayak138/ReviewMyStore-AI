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

type IndexRow = {
  table_name: string;
  index_name: string;
  is_unique: boolean;
  columns: readonly string[];
  predicate: string | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_type: string;
  foreign_table_name: string | null;
  local_columns: readonly string[] | null;
  foreign_columns: readonly string[] | null;
  delete_rule: string | null;
};

export type TeamSchemaCatalog = {
  enums: EnumRow[];
  columns: ColumnRow[];
  indexes: IndexRow[];
  constraints: ConstraintRow[];
};

export const expectedEnums = new Map<string, string[]>([
  ["user_role", ["SUPER_ADMIN", "OWNER", "TEAM_MEMBER"]],
  ["team_permission", ["NONE", "VIEW", "MANAGE"]],
  ["analytics_permission", ["NONE", "VIEW"]],
  ["team_invitation_status", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]],
]);

export const requiredColumns = [
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

export const expectedIndexes = [
  ["business_memberships", "business_memberships_business_user_uidx", true, ["business_id", "user_id"]],
  ["business_memberships", "business_memberships_organization_idx", false, ["organization_id"]],
  ["business_memberships", "business_memberships_user_idx", false, ["user_id"]],
  ["team_invitations", "team_invitations_token_hash_unique", true, ["token_hash"]],
  ["team_invitations", "team_invitations_business_idx", false, ["business_id"]],
  ["team_invitations", "team_invitations_organization_idx", false, ["organization_id"]],
  ["team_invitations", "team_invitations_email_idx", false, ["email"]],
  ["team_invitations", "team_invitations_pending_email_business_uidx", true, ["business_id", "email"], "PENDING"],
  ["team_audit_events", "team_audit_events_business_created_idx", false, ["business_id", "created_at"]],
  ["team_audit_events", "team_audit_events_organization_idx", false, ["organization_id"]],
] as const;

export const requiredPrimaryKeyTables = [
  "business_memberships",
  "team_invitations",
  "team_audit_events",
] as const;

export const requiredForeignKeys = [
  ["business_memberships", ["organization_id"], "organizations", ["id"], "CASCADE"],
  ["business_memberships", ["business_id"], "businesses", ["id"], "CASCADE"],
  ["business_memberships", ["user_id"], "users", ["id"], "CASCADE"],
  ["team_invitations", ["organization_id"], "organizations", ["id"], "CASCADE"],
  ["team_invitations", ["business_id"], "businesses", ["id"], "CASCADE"],
  ["team_invitations", ["invited_by_user_id"], "users", ["id"], "RESTRICT"],
  ["team_audit_events", ["organization_id"], "organizations", ["id"], "CASCADE"],
  ["team_audit_events", ["business_id"], "businesses", ["id"], "SET NULL"],
  ["team_audit_events", ["actor_user_id"], "users", ["id"], "SET NULL"],
  ["team_audit_events", ["target_user_id"], "users", ["id"], "SET NULL"],
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

/**
 * Keep this catalog predicate aligned with scripts/verify-team-schema.ts.
 * The runtime check must reject a partial Publish even when all tables and
 * columns are present but a key, index, or foreign key is still missing.
 */
export function isTeamSchemaCatalogReady(catalog: TeamSchemaCatalog): boolean {
  const enums = new Map(
    catalog.enums.map((row) => [row.enum_name, row.labels]),
  );
  for (const [name, labels] of expectedEnums) {
    if (JSON.stringify(enums.get(name)) !== JSON.stringify(labels)) {
      return false;
    }
  }

  const columns = new Map(
    catalog.columns.map((row) => [`${row.table_name}.${row.column_name}`, row]),
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

  const indexes = new Map(
    catalog.indexes.map((row) => [`${row.table_name}.${row.index_name}`, row]),
  );
  for (const [table, name, unique, columns, requiredPredicate] of expectedIndexes) {
    const row = indexes.get(`${table}.${name}`);
    if (
      !row ||
      row.is_unique !== unique ||
      JSON.stringify(row.columns) !== JSON.stringify(columns) ||
      (requiredPredicate && !row.predicate?.includes(requiredPredicate))
    ) {
      return false;
    }
  }

  const primaryKeys = new Set(
    catalog.constraints
      .filter((row) => row.constraint_type === "p")
      .map((row) => row.table_name),
  );
  for (const table of requiredPrimaryKeyTables) {
    if (!primaryKeys.has(table)) {
      return false;
    }
  }

  const foreignKeys = new Set(
    catalog.constraints
      .filter((row) => row.constraint_type === "f")
      .map((row) =>
        JSON.stringify([
          row.table_name,
          row.local_columns,
          row.foreign_table_name,
          row.foreign_columns,
          row.delete_rule,
        ]),
      ),
  );
  for (const expected of requiredForeignKeys) {
    if (!foreignKeys.has(JSON.stringify(expected))) {
      return false;
    }
  }
  return true;
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

    const columnResult = await pool.query<ColumnRow>(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          table_name IN ('business_memberships', 'team_invitations', 'team_audit_events')
          OR (table_name = 'users' AND column_name = 'role')
        )
    `);

    const indexResult = await pool.query<IndexRow>(`
      SELECT t.relname AS table_name,
             i.relname AS index_name,
             ix.indisunique AS is_unique,
             json_agg(a.attname ORDER BY key.ordinality) AS columns,
             pg_get_expr(ix.indpred, ix.indrelid) AS predicate
      FROM pg_class t
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_index ix ON ix.indrelid = t.oid
      JOIN pg_class i ON i.oid = ix.indexrelid
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS key(attnum, ordinality)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = key.attnum
      WHERE n.nspname = 'public'
        AND t.relname IN ('business_memberships', 'team_invitations', 'team_audit_events')
      GROUP BY t.relname, i.relname, ix.indisunique, ix.indpred, ix.indrelid
    `);

    const constraintResult = await pool.query<ConstraintRow>(`
      SELECT child.relname AS table_name,
             c.contype AS constraint_type,
             parent.relname AS foreign_table_name,
             COALESCE((
               SELECT json_agg(child_col.attname ORDER BY child_key.ordinal)
               FROM unnest(c.conkey) WITH ORDINALITY AS child_key(attnum, ordinal)
               JOIN pg_attribute child_col
                 ON child_col.attrelid = c.conrelid AND child_col.attnum = child_key.attnum
             ), '[]'::json) AS local_columns,
             COALESCE((
               SELECT json_agg(parent_col.attname ORDER BY parent_key.ordinal)
               FROM unnest(c.confkey) WITH ORDINALITY AS parent_key(attnum, ordinal)
               JOIN pg_attribute parent_col
                 ON parent_col.attrelid = c.confrelid AND parent_col.attnum = parent_key.attnum
             ), '[]'::json) AS foreign_columns,
             CASE c.confdeltype
               WHEN 'a' THEN 'NO ACTION'
               WHEN 'r' THEN 'RESTRICT'
               WHEN 'c' THEN 'CASCADE'
               WHEN 'n' THEN 'SET NULL'
               WHEN 'd' THEN 'SET DEFAULT'
             END AS delete_rule
      FROM pg_constraint c
      JOIN pg_class child ON child.oid = c.conrelid
      LEFT JOIN pg_class parent ON parent.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = child.relnamespace
      WHERE n.nspname = 'public'
        AND child.relname IN ('business_memberships', 'team_invitations', 'team_audit_events')
    `);

    return isTeamSchemaCatalogReady({
      enums: enumResult.rows,
      columns: columnResult.rows,
      indexes: indexResult.rows,
      constraints: constraintResult.rows,
    });
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