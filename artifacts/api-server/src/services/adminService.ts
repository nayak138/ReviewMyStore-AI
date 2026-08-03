import { count, eq } from "drizzle-orm";
import { db, organizationsTable, usersTable } from "@workspace/db";

export async function getAdminOverview() {
  const [[orgCount], [suspendedOrgCount], [ownerCount], [superAdminCount]] =
    await Promise.all([
      db.select({ value: count() }).from(organizationsTable),
      db
        .select({ value: count() })
        .from(organizationsTable)
        .where(eq(organizationsTable.status, "SUSPENDED")),
      db
        .select({ value: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "OWNER")),
      db
        .select({ value: count() })
        .from(usersTable)
        .where(eq(usersTable.role, "SUPER_ADMIN")),
    ]);

  return {
    totalOrganizations: orgCount.value,
    totalSuspendedOrganizations: suspendedOrgCount.value,
    totalOwners: ownerCount.value,
    totalSuperAdmins: superAdminCount.value,
  };
}
