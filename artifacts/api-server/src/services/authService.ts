import { eq, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, organizationsTable, usersTable, type User } from "@workspace/db";

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

/** Max attempts to regenerate an org slug when it collides with a concurrent insert. */
const MAX_PROVISION_ATTEMPTS = 20;

function isUniqueViolation(error: unknown, constraint: string): boolean {
  // drizzle-orm wraps the driver error as `DrizzleQueryError`, with the raw
  // `pg` error (carrying `code`/`constraint`) on `.cause` rather than on the
  // thrown error itself, so both need to be checked.
  for (const candidate of [error, (error as { cause?: unknown })?.cause]) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      (candidate as { code?: unknown }).code === UNIQUE_VIOLATION &&
      (candidate as { constraint?: unknown }).constraint === constraint
    ) {
      return true;
    }
  }
  return false;
}

async function findUserByClerkId(clerkUserId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return user ?? null;
}

async function touchLastLogin(user: User): Promise<User> {
  const [updated] = await db
    .update(usersTable)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  return updated;
}

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

// Minimal shape shared by `db` and a transaction handle (`tx`), so the slug
// probe can run against either.
type QueryExecutor = Pick<typeof db, "select">;

async function generateUniqueOrgSlug(
  base: string,
  executor: QueryExecutor = db,
): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 1;

  // Small tenant counts expected for the MVP; a linear probe is sufficient.
  while (true) {
    const existing = await executor
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
 *
 * The initial existence check and the eventual insert are not atomic, so two
 * concurrent first-login requests for the same brand-new Clerk user can both
 * reach the provisioning path (e.g. the frontend firing more than one
 * authenticated request before the row exists). This is closed in two
 * layers:
 *  1. A Postgres advisory lock keyed on the Clerk user id serializes
 *     concurrent provisioning attempts for the *same* user, so the loser
 *     waits, re-reads, and reuses the row the winner just committed.
 *  2. A retry loop catches a unique-constraint violation that slips through
 *     anyway (e.g. two different brand-new users whose names produce the
 *     same org slug) and either regenerates the slug or falls back to the
 *     row a concurrent request already created, instead of surfacing a raw
 *     500 to the client.
 */
export async function getOrCreateUserForClerkId(
  clerkUserId: string,
): Promise<User> {
  const existing = await findUserByClerkId(clerkUserId);
  if (existing) return touchLastLogin(existing);

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

  for (let attempt = 0; attempt < MAX_PROVISION_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // Serialize concurrent provisioning attempts for this exact Clerk
        // user. The lock is scoped to the transaction and released
        // automatically on commit or rollback.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${clerkUserId}))`,
        );

        // A concurrent request may have finished provisioning this user
        // while we were waiting on the lock above; reuse its row instead of
        // racing to insert a duplicate.
        const [nowExisting] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId))
          .limit(1);
        if (nowExisting) {
          const [updated] = await tx
            .update(usersTable)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where(eq(usersTable.id, nowExisting.id))
            .returning();
          return updated;
        }

        if (isSuperAdmin) {
          const [created] = await tx
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

        const slug = await generateUniqueOrgSlug(name || email, tx);
        const [organization] = await tx
          .insert(organizationsTable)
          .values({ name: `${name}'s Organization`, slug })
          .returning();

        const [created] = await tx
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
      });
    } catch (error) {
      // A different brand-new user landed on the same org slug between our
      // probe and insert (the advisory lock above only serializes attempts
      // for this same Clerk user) — retry with a freshly probed slug.
      if (isUniqueViolation(error, "organizations_slug_unique")) {
        continue;
      }
      // Someone else already provisioned this exact user; reuse that row.
      if (
        isUniqueViolation(error, "users_clerk_user_id_unique") ||
        isUniqueViolation(error, "users_email_unique")
      ) {
        const winner = await findUserByClerkId(clerkUserId);
        if (winner) return touchLastLogin(winner);
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to provision user for Clerk id ${clerkUserId} after ${MAX_PROVISION_ATTEMPTS} attempts`,
  );
}

export async function getOrganizationById(id: string) {
  const [organization] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, id))
    .limit(1);
  return organization ?? null;
}
