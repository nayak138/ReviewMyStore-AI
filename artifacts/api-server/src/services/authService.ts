import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/express";
import {
  accountDataExportsTable,
  accountDeactivationRequestsTable,
  agencyInvitationsTable,
  businessMembershipsTable,
  businessesTable,
  db,
  organizationsTable,
  teamInvitationsTable,
  usersTable,
  type User,
} from "@workspace/db";

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

/** Max attempts to regenerate an org slug when it collides with a concurrent insert. */
const MAX_PROVISION_ATTEMPTS = 20;

export class AgencyInvitationRequiredError extends Error {
  constructor() {
    super("An active agency invitation is required to create an account");
    this.name = "AgencyInvitationRequiredError";
  }
}

export class VerifiedEmailRequiredError extends Error {
  constructor() {
    super("A verified primary email address is required to create an account");
    this.name = "VerifiedEmailRequiredError";
  }
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const ACCOUNT_EXPORT_EXCLUDED_DATA = [
  "businesses",
  "workspaces",
  "teams",
  "Google connections",
  "campaigns",
  "reviews and private feedback",
] as const;
export const ACCOUNT_EXPORT_TTL_MS = 15 * 60 * 1000;

const DEACTIVATION_MESSAGE =
  "Your request is pending review. Your sign-in remains active, and no business or workspace data has been changed.";

export function buildAccountDataExport(
  user: User,
  requestedAt = new Date(),
  exportId: string = randomUUID(),
  expiresAt = new Date(requestedAt.getTime() + ACCOUNT_EXPORT_TTL_MS),
) {
  return {
    exportId,
    requestedAt,
    expiresAt,
    scope: "ACCOUNT" as const,
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
    excludedData: [...ACCOUNT_EXPORT_EXCLUDED_DATA],
  };
}

export function buildAccountDeactivationRequest(requestedAt = new Date()) {
  return {
    requestId: randomUUID(),
    requestedAt,
    status: "PENDING_REVIEW" as const,
    message:
      DEACTIVATION_MESSAGE,
  };
}

export async function createAccountDataExport(
  user: User,
  requestedAt = new Date(),
) {
  const expiresAt = new Date(requestedAt.getTime() + ACCOUNT_EXPORT_TTL_MS);
  await db
    .update(accountDataExportsTable)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(accountDataExportsTable.status, "ISSUED"),
        lt(accountDataExportsTable.expiresAt, requestedAt),
      ),
    );
  const [audit] = await db
    .insert(accountDataExportsTable)
    .values({
      userId: user.id,
      organizationId: user.organizationId,
      requestedAt,
      expiresAt,
      status: "ISSUED",
      deliveredAt: requestedAt,
    })
    .returning({
      id: accountDataExportsTable.id,
      requestedAt: accountDataExportsTable.requestedAt,
      expiresAt: accountDataExportsTable.expiresAt,
    });

  return buildAccountDataExport(
    user,
    audit.requestedAt,
    audit.id,
    audit.expiresAt,
  );
}

export async function createAccountDeactivationRequest(
  user: User,
  requestedAt = new Date(),
) {
  const [existing] = await db
    .select({
      id: accountDeactivationRequestsTable.id,
      requestedAt: accountDeactivationRequestsTable.requestedAt,
      status: accountDeactivationRequestsTable.status,
    })
    .from(accountDeactivationRequestsTable)
    .where(
      and(
        eq(accountDeactivationRequestsTable.userId, user.id),
        eq(accountDeactivationRequestsTable.status, "PENDING_REVIEW"),
      ),
    )
    .orderBy(desc(accountDeactivationRequestsTable.requestedAt))
    .limit(1);

  if (existing) {
    return {
      requestId: existing.id,
      requestedAt: existing.requestedAt,
      status: existing.status,
      message: DEACTIVATION_MESSAGE,
    };
  }

  const [created] = await db
    .insert(accountDeactivationRequestsTable)
    .values({
      userId: user.id,
      organizationId: user.organizationId,
      requestedAt,
      status: "PENDING_REVIEW",
    })
    .returning();

  return {
    requestId: created.id,
    requestedAt: created.requestedAt,
    status: created.status,
    message: DEACTIVATION_MESSAGE,
  };
}

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
  const isAllowlistedSuperAdmin = getSuperAdminEmails().has(
    user.email.trim().toLowerCase(),
  );
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(isAllowlistedSuperAdmin
        ? { role: "SUPER_ADMIN" as const, organizationId: null }
        : {}),
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
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

export async function generateUniqueOrgSlug(
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
 *  1. Postgres advisory locks keyed on the Clerk user id and normalized email
 *     serialize concurrent provisioning attempts for the same identity or
 *     allowlisted email, so the loser waits, re-reads, and reuses the row the
 *     winner just committed.
 *  2. A retry loop catches a unique-constraint violation that slips through
 *     anyway (e.g. two different brand-new users whose names produce the
 *     same org slug) and either regenerates the slug or falls back to the
 *     row a concurrent request already created, instead of surfacing a raw
 *     500 to the client.
 */
export async function getOrCreateUserForClerkId(
  clerkUserId: string,
  options: { teamInvitationToken?: string } = {},
): Promise<User> {
  const existing = await findUserByClerkId(clerkUserId);
  if (existing) return touchLastLogin(existing);

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );
  if (
    !primaryEmail?.emailAddress ||
    primaryEmail.verification?.status !== "verified"
  ) {
    throw new VerifiedEmailRequiredError();
  }
  const email = primaryEmail.emailAddress;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0];
  const normalizedEmail = email.toLowerCase();

  const isSuperAdmin = getSuperAdminEmails().has(normalizedEmail);

  for (let attempt = 0; attempt < MAX_PROVISION_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // Serialize concurrent provisioning attempts for this exact Clerk
        // user and for the email that identifies a local account. The locks
        // are scoped to the transaction and released automatically on commit
        // or rollback.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${clerkUserId}))`,
        );
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${normalizedEmail}))`,
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
          // An allowlisted email may already have a local account created
          // before it was added to SUPER_ADMIN_EMAILS. Reconcile both the
          // Clerk subject and platform authorization so the configured
          // allowlist remains the source of truth for Super Admin access.
          const [emailExisting] = await tx
            .select()
            .from(usersTable)
            .where(sql`lower(${usersTable.email}) = ${normalizedEmail}`)
            .limit(1);
          if (emailExisting) {
            const [updated] = await tx
              .update(usersTable)
              .set({
                clerkUserId,
                role: "SUPER_ADMIN",
                organizationId: null,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(usersTable.id, emailExisting.id))
              .returning();
            return updated;
          }

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

        // The explicit team acceptance request carries its opaque token in
        // the request body. Prefer that exact invitation before the agency
        // email lookup so a user who happens to have both invitations cannot
        // be provisioned as an OWNER by an unrelated invitation.
        if (options.teamInvitationToken) {
          const [tokenInvitation] = await tx
            .select({
              organizationId: teamInvitationsTable.organizationId,
            })
            .from(teamInvitationsTable)
            .innerJoin(
              organizationsTable,
              eq(teamInvitationsTable.organizationId, organizationsTable.id),
            )
            .innerJoin(
              businessesTable,
              eq(businessesTable.id, teamInvitationsTable.businessId),
            )
            .where(
              and(
                eq(
                  teamInvitationsTable.tokenHash,
                  hashInvitationToken(options.teamInvitationToken),
                ),
                eq(teamInvitationsTable.email, normalizedEmail),
                eq(teamInvitationsTable.status, "PENDING"),
                gt(teamInvitationsTable.expiresAt, new Date()),
                eq(organizationsTable.status, "ACTIVE"),
                eq(businessesTable.status, "ACTIVE"),
                isNull(businessesTable.archivedAt),
                isNull(businessesTable.deletedAt),
              ),
            )
            .limit(1);

          if (tokenInvitation) {
            const [created] = await tx
              .insert(usersTable)
              .values({
                organizationId: tokenInvitation.organizationId,
                clerkUserId,
                name,
                email,
                role: "TEAM_MEMBER",
                status: "ACTIVE",
                lastLoginAt: new Date(),
              })
              .returning();
            return created;
          }
        }

        const [invitation] = await tx
          .select({
            id: agencyInvitationsTable.id,
            organizationId: agencyInvitationsTable.organizationId,
          })
          .from(agencyInvitationsTable)
          .innerJoin(
            organizationsTable,
            eq(agencyInvitationsTable.organizationId, organizationsTable.id),
          )
          .where(
            and(
              eq(agencyInvitationsTable.email, email.toLowerCase()),
              eq(agencyInvitationsTable.status, "PENDING"),
              gt(agencyInvitationsTable.expiresAt, new Date()),
              eq(organizationsTable.status, "ACTIVE"),
            ),
          )
          .orderBy(desc(agencyInvitationsTable.createdAt))
          .limit(1);

        if (invitation) {
          const [created] = await tx
            .insert(usersTable)
            .values({
              organizationId: invitation.organizationId,
              clerkUserId,
              name,
              email,
              role: "OWNER",
              status: "ACTIVE",
              lastLoginAt: new Date(),
            })
            .returning();
          await tx
            .update(agencyInvitationsTable)
            .set({ status: "ACCEPTED", acceptedAt: new Date() })
            .where(eq(agencyInvitationsTable.id, invitation.id));
          return created;
        }

        throw new AgencyInvitationRequiredError();
      });
    } catch (error) {
      // A different brand-new user landed on the same org slug between our
      // probe and insert (the advisory lock above only serializes attempts
      // for this same Clerk user) — retry with a freshly probed slug.
      if (isUniqueViolation(error, "organizations_slug_unique")) {
        continue;
      }
      // Someone else already provisioned this exact Clerk identity; reuse it.
      if (isUniqueViolation(error, "users_clerk_user_id_unique")) {
        const winner = await findUserByClerkId(clerkUserId);
        if (winner) return touchLastLogin(winner);
      }
      // A previous deployment may not have held the normalized-email lock.
      // Retry an allowlisted super admin so the transactional email lookup
      // above can reconcile it. Owner invitation reuse remains rejected.
      if (
        isSuperAdmin &&
        isUniqueViolation(error, "users_email_unique")
      ) {
        continue;
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

export async function getUserTeamAccess(userId: string, organizationId: string | null) {
  if (!organizationId) return [];
  return db
    .select({
      businessId: businessMembershipsTable.businessId,
      businessName: businessesTable.name,
      campaignsPermission: businessMembershipsTable.campaignsPermission,
      reviewInboxPermission: businessMembershipsTable.reviewInboxPermission,
      feedbackPermission: businessMembershipsTable.feedbackPermission,
      socialMediaPermission: businessMembershipsTable.socialMediaPermission,
      analyticsPermission: businessMembershipsTable.analyticsPermission,
    })
    .from(businessMembershipsTable)
    .innerJoin(businessesTable, eq(businessesTable.id, businessMembershipsTable.businessId))
    .where(
      and(
        eq(businessMembershipsTable.userId, userId),
        eq(businessMembershipsTable.organizationId, organizationId),
        isNull(businessMembershipsTable.removedAt),
        isNull(businessesTable.deletedAt),
        eq(businessesTable.status, "ACTIVE"),
        isNull(businessesTable.archivedAt),
      ),
    );
}

export async function getEmailPreferences(userId: string) {
  const [user] = await db
    .select({
      productUpdates: usersTable.productUpdatesEnabled,
      releaseAnnouncements: usersTable.releaseAnnouncementsEnabled,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return null;

  return {
    ...user,
    securityMessages: true,
    accountServiceMessages: true,
  };
}

export async function updateEmailPreferences(
  userId: string,
  preferences: {
    productUpdates?: boolean;
    releaseAnnouncements?: boolean;
  },
) {
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(preferences.productUpdates === undefined
        ? {}
        : { productUpdatesEnabled: preferences.productUpdates }),
      ...(preferences.releaseAnnouncements === undefined
        ? {}
        : {
            releaseAnnouncementsEnabled: preferences.releaseAnnouncements,
          }),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId))
    .returning({
      productUpdates: usersTable.productUpdatesEnabled,
      releaseAnnouncements: usersTable.releaseAnnouncementsEnabled,
    });

  if (!updated) return null;

  return {
    ...updated,
    securityMessages: true,
    accountServiceMessages: true,
  };
}
