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
  column_default: string | null;
};

type IndexRow = {
  table_name: string;
  index_name: string;
  is_unique: boolean;
  columns: string[];
  predicate: string | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_type: string;
  foreign_table_name: string | null;
  local_columns: string[] | null;
  foreign_columns: string[] | null;
  delete_rule: string | null;
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

const expectedIndexes = [
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

const requiredForeignKeys = [
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

const enumResult = await pool.query<EnumRow>(`
  SELECT t.typname AS enum_name,
         json_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  WHERE t.typname IN ('user_role', 'team_permission', 'analytics_permission', 'team_invitation_status')
  GROUP BY t.typname
`);

const columnResult = await pool.query<ColumnRow>(`
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
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

const errors: string[] = [];
const enumRows = new Map(enumResult.rows.map((row) => [row.enum_name, row.labels]));
for (const [name, labels] of expectedEnums) {
  if (!enumRows.has(name)) {
    errors.push(`missing enum ${name}`);
  } else if (JSON.stringify(enumRows.get(name)) !== JSON.stringify(labels)) {
    errors.push(`enum ${name} labels are ${JSON.stringify(enumRows.get(name))}, expected ${JSON.stringify(labels)}`);
  }
}

const columnRows = new Map(
  columnResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
);
for (const [table, column, dataType, udtName, nullable] of requiredColumns) {
  const key = `${table}.${column}`;
  const row = columnRows.get(key);
  if (!row) {
    errors.push(`missing column ${key}`);
    continue;
  }
  if (row.data_type !== dataType || row.udt_name !== udtName || row.is_nullable !== nullable) {
    errors.push(
      `column ${key} is ${row.data_type}/${row.udt_name}/${row.is_nullable}, expected ${dataType}/${udtName}/${nullable}`,
    );
  }
}

const indexRows = new Map(indexResult.rows.map((row) => [`${row.table_name}.${row.index_name}`, row]));
for (const [table, name, unique, columns, requiredPredicate] of expectedIndexes) {
  const row = indexRows.get(`${table}.${name}`);
  if (!row) {
    errors.push(`missing index ${table}.${name}`);
    continue;
  }
  if (
    row.is_unique !== unique ||
    JSON.stringify(row.columns) !== JSON.stringify(columns) ||
    (requiredPredicate && !row.predicate?.includes(requiredPredicate))
  ) {
    errors.push(`index ${table}.${name} does not match its expected uniqueness or columns`);
  }
}

const primaryKeys = new Set(
  constraintResult.rows
    .filter((row) => row.constraint_type === "p")
    .map((row) => row.table_name),
);
for (const table of ["business_memberships", "team_invitations", "team_audit_events"]) {
  if (!primaryKeys.has(table)) errors.push(`missing primary key on ${table}`);
}

const foreignKeys = new Set(
  constraintResult.rows
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
  const normalized = JSON.stringify(expected);
  if (!foreignKeys.has(normalized)) {
    errors.push(`missing foreign key ${normalized}`);
  }
}

if (errors.length > 0) {
  console.error("Team schema readiness check FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "Keep invitations and TEAM_MEMBER access disabled. Do not run db:push against production or add startup DDL; complete the user-approved Publish flow, then rerun this catalog check against production.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Team schema readiness check PASSED: enums, TEAM_MEMBER role, columns, indexes, primary keys, and foreign keys are present.",
  );
}

await pool.end();