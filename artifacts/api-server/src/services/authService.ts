import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, organizationsTable, usersTable, type User } from "@workspace/db";

/**
 * Comma-separated allowlist of emails that should be provisioned as
 * SUPER_ADMIN on first login instead of getting their own Organization.
 * Configured via the SUPER_ADMIN_EMAILS env var (empty by default).
 */
function getSuperAdminEmails(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organization"
  );
}

async function generateUniqueOrgSlug(base: string): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 1;

  // Small tenant counts expected for the MVP; a linear probe is sufficient.
  while (true) {
    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

/**
 * Looks up the local user bridged to a Clerk identity, provisioning it on
 * first sight. New Owners get a freshly created Organization; emails on the
 * SUPER_ADMIN_EMAILS allowlist are provisioned as platform-wide Super Admins
 * with no Organization.
 */
export async function getOrCreateUserForClerkId(
  clerkUserId: string,
): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, existing.id))
      .returning();
    return updated;
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error(`Clerk user ${clerkUserId} has no email address`);
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];

  const isSuperAdmin = getSuperAdminEmails().has(email.toLowerCase());

  if (isSuperAdmin) {
    const [created] = await db
      .insert(usersTable)
      .values({
        organizationId: null,
        clerkUserId,
        name,
        email,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        lastLoginAt: new Date(),
      })
      .returning();
    return created;
  }

  const slug = await generateUniqueOrgSlug(name || email);
  const [organization] = await db
    .insert(organizationsTable)
    .values({ name: `${name}'s Organization`, slug })
    .returning();

  const [created] = await db
    .insert(usersTable)
    .values({
      organizationId: organization.id,
      clerkUserId,
      name,
      email,
      role: "OWNER",
      status: "ACTIVE",
      lastLoginAt: new Date(),
    })
    .returning();
  return created;
}

export async function getOrganizationById(id: string) {
  const [organization] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, id))
    .limit(1);
  return organization ?? null;
}
