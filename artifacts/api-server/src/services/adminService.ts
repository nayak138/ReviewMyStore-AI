import { createHash, randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
} from "drizzle-orm";
import {
  accountDeactivationRequestsTable,
  agencyInvitationsTable,
  businessesTable,
  db,
  organizationsTable,
  reviewGenerationReservationsTable,
  usersTable,
} from "@workspace/db";
import { generateUniqueOrgSlug } from "./authService";
import { sendAgencyOwnerInvitationEmail } from "./notificationService";

const DEFAULT_INVITATION_DAYS = 14;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export class AdminAgencyNotFoundError extends Error {
  constructor(id: string) {
    super(`Agency ${id} not found`);
    this.name = "AdminAgencyNotFoundError";
  }
}

export class AdminOwnerAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}`);
    this.name = "AdminOwnerAlreadyExistsError";
  }
}

export class AdminInvitationNotFoundError extends Error {
  constructor() {
    super("Invitation not found or no longer active");
    this.name = "AdminInvitationNotFoundError";
  }
}

export class AdminDeactivationRequestNotFoundError extends Error {
  constructor(id: string) {
    super(`Deactivation request ${id} not found`);
    this.name = "AdminDeactivationRequestNotFoundError";
  }
}

export class AdminDeactivationRequestAlreadyReviewedError extends Error {
  constructor() {
    super("This deactivation request has already been reviewed");
    this.name = "AdminDeactivationRequestAlreadyReviewedError";
  }
}

function invitationExpiry(days = DEFAULT_INVITATION_DAYS): Date {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 90);
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}

async function createInvitation(
  organizationId: string,
  createdByUserId: string,
  email: string,
  expiresInDays?: number,
) {
  const token = randomBytes(32).toString("base64url");
  const [invitation] = await db
    .insert(agencyInvitationsTable)
    .values({
      organizationId,
      createdByUserId,
      email: email.trim().toLowerCase(),
      tokenHash: hashToken(token),
      expiresAt: invitationExpiry(expiresInDays),
    })
    .returning();

  return {
    id: invitation.id,
    email: invitation.email,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    signupPath: `/agency/join/${token}`,
  };
}

export async function getAdminOverview() {
  const [
    [orgCount],
    [suspendedOrgCount],
    [ownerCount],
    [superAdminCount],
    [businessCount],
    [pendingInvitationCount],
  ] = await Promise.all([
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
    db
      .select({ value: count() })
      .from(businessesTable)
      .where(isNull(businessesTable.deletedAt)),
    db
      .select({ value: count() })
      .from(agencyInvitationsTable)
      .where(
        and(
          eq(agencyInvitationsTable.status, "PENDING"),
          gt(agencyInvitationsTable.expiresAt, new Date()),
        ),
      ),
  ]);

  return {
    totalOrganizations: orgCount.value,
    totalOwners: ownerCount.value,
    totalSuperAdmins: superAdminCount.value,
    totalSuspendedOrganizations: suspendedOrgCount.value,
    totalBusinesses: businessCount.value,
    pendingInvitations: pendingInvitationCount.value,
  };
}

export async function getAdminPortal() {
  const organizations = await db
    .select()
    .from(organizationsTable)
    .orderBy(desc(organizationsTable.createdAt));
  const organizationIds = organizations.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return { overview: await getAdminOverview(), agencies: [], businesses: [] };
  }

  const [owners, businesses, invitations] = await Promise.all([
    db
      .select({
        organizationId: usersTable.organizationId,
        name: usersTable.name,
        email: usersTable.email,
        status: usersTable.status,
        lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "OWNER"),
          inArray(usersTable.organizationId, organizationIds),
        ),
      ),
    db
      .select({
        id: businessesTable.id,
        organizationId: businessesTable.organizationId,
        name: businessesTable.name,
        slug: businessesTable.slug,
        category: businessesTable.category,
        status: businessesTable.status,
        archivedAt: businessesTable.archivedAt,
        createdAt: businessesTable.createdAt,
        organizationName: organizationsTable.name,
        organizationSlug: organizationsTable.slug,
      })
      .from(businessesTable)
      .innerJoin(
        organizationsTable,
        eq(businessesTable.organizationId, organizationsTable.id),
      )
      .where(isNull(businessesTable.deletedAt))
      .orderBy(desc(businessesTable.createdAt)),
    db
      .select()
      .from(agencyInvitationsTable)
      .where(
        and(
          eq(agencyInvitationsTable.status, "PENDING"),
          inArray(agencyInvitationsTable.organizationId, organizationIds),
        ),
      )
      .orderBy(desc(agencyInvitationsTable.createdAt)),
  ]);

  const ownerByOrg = new Map(
    owners.map((owner) => [owner.organizationId, owner]),
  );
  const businessesByOrg = new Map<string, number>();
  for (const business of businesses) {
    businessesByOrg.set(
      business.organizationId,
      (businessesByOrg.get(business.organizationId) ?? 0) + 1,
    );
  }
  const inviteByOrg = new Map<string, (typeof invitations)[number]>();
  for (const invitation of invitations) {
    if (!inviteByOrg.has(invitation.organizationId)) {
      inviteByOrg.set(invitation.organizationId, invitation);
    }
  }

  return {
    overview: await getAdminOverview(),
    agencies: organizations.map((organization) => {
      const owner = ownerByOrg.get(organization.id);
      const invitation = inviteByOrg.get(organization.id);
      return {
        ...organization,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        startDate: iso(organization.startDate),
        renewalDate: iso(organization.renewalDate),
        expiryDate: iso(organization.expiryDate),
        owner: owner
          ? {
              name: owner.name,
              email: owner.email,
              status: owner.status,
              lastLoginAt: iso(owner.lastLoginAt),
            }
          : null,
        businessCount: businessesByOrg.get(organization.id) ?? 0,
        pendingInvitation: invitation
          ? {
              id: invitation.id,
              email: invitation.email,
              expiresAt: invitation.expiresAt.toISOString(),
              createdAt: invitation.createdAt.toISOString(),
            }
          : null,
      };
    }),
    businesses: businesses.map((business) => ({
      ...business,
      archivedAt: iso(business.archivedAt),
      createdAt: business.createdAt.toISOString(),
    })),
  };
}

export async function resetPlatformTenantData() {
  return db.transaction(async (tx) => {
    // A transaction uses one database client, so these queries must remain
    // sequential. Running them with Promise.all causes concurrent client.query
    // calls, which PostgreSQL drivers are removing support for.
    const [organizationCount] = await tx
      .select({ value: count() })
      .from(organizationsTable);
    const [ownerCount] = await tx
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "OWNER"));
    const [businessCount] = await tx
      .select({ value: count() })
      .from(businessesTable);

    // Reservations intentionally have no foreign key because in-flight
    // generation must survive ordinary tenant record changes. A platform
    // reset is different: all tenant state is being deliberately removed.
    await tx.delete(reviewGenerationReservationsTable);
    await tx.delete(organizationsTable);
    // Remove any malformed/orphaned Owner rows that were not attached to an
    // organization. SUPER_ADMIN rows are deliberately preserved.
    await tx.delete(usersTable).where(eq(usersTable.role, "OWNER"));

    return {
      deletedOrganizations: organizationCount.value,
      deletedOwners: ownerCount.value,
      deletedBusinesses: businessCount.value,
    };
  });
}

function serializeDeactivationRequest(
  request: {
    id: string;
    userId: string;
    organizationId: string | null;
    requestedAt: Date;
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    reviewedAt: Date | null;
    reviewedByUserId: string | null;
    reviewerNote: string | null;
    userName: string;
    userEmail: string;
    organizationName: string | null;
  },
) {
  return {
    id: request.id,
    userId: request.userId,
    userName: request.userName,
    userEmail: request.userEmail,
    organizationId: request.organizationId,
    organizationName: request.organizationName,
    requestedAt: request.requestedAt.toISOString(),
    status: request.status,
    reviewedAt: iso(request.reviewedAt),
    reviewedByUserId: request.reviewedByUserId,
    reviewerNote: request.reviewerNote,
  };
}

export async function listAdminDeactivationRequests() {
  const rows = await db
    .select({
      id: accountDeactivationRequestsTable.id,
      userId: accountDeactivationRequestsTable.userId,
      organizationId: accountDeactivationRequestsTable.organizationId,
      requestedAt: accountDeactivationRequestsTable.requestedAt,
      status: accountDeactivationRequestsTable.status,
      reviewedAt: accountDeactivationRequestsTable.reviewedAt,
      reviewedByUserId: accountDeactivationRequestsTable.reviewedByUserId,
      reviewerNote: accountDeactivationRequestsTable.reviewerNote,
      userName: usersTable.name,
      userEmail: usersTable.email,
      organizationName: organizationsTable.name,
    })
    .from(accountDeactivationRequestsTable)
    .innerJoin(
      usersTable,
      eq(accountDeactivationRequestsTable.userId, usersTable.id),
    )
    .leftJoin(
      organizationsTable,
      eq(accountDeactivationRequestsTable.organizationId, organizationsTable.id),
    )
    .orderBy(desc(accountDeactivationRequestsTable.requestedAt));

  return {
    requests: rows.map(serializeDeactivationRequest),
    pendingCount: rows.filter((row) => row.status === "PENDING_REVIEW").length,
  };
}

export async function reviewAdminDeactivationRequest(
  id: string,
  reviewerId: string,
  status: "APPROVED" | "REJECTED",
  reviewerNote?: string,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ status: accountDeactivationRequestsTable.status })
      .from(accountDeactivationRequestsTable)
      .where(eq(accountDeactivationRequestsTable.id, id))
      .limit(1);
    if (!existing) throw new AdminDeactivationRequestNotFoundError(id);
    if (existing.status !== "PENDING_REVIEW") {
      throw new AdminDeactivationRequestAlreadyReviewedError();
    }

    const reviewedAt = new Date();
    const [updated] = await tx
      .update(accountDeactivationRequestsTable)
      .set({
        status,
        reviewedAt,
        reviewedByUserId: reviewerId,
        reviewerNote: reviewerNote?.trim() || null,
      })
      .where(eq(accountDeactivationRequestsTable.id, id))
      .returning();

    if (status === "APPROVED") {
      await tx
        .update(usersTable)
        .set({ status: "SUSPENDED", updatedAt: reviewedAt })
        .where(eq(usersTable.id, updated.userId));
    }

    const [result] = await tx
      .select({
        id: accountDeactivationRequestsTable.id,
        userId: accountDeactivationRequestsTable.userId,
        organizationId: accountDeactivationRequestsTable.organizationId,
        requestedAt: accountDeactivationRequestsTable.requestedAt,
        status: accountDeactivationRequestsTable.status,
        reviewedAt: accountDeactivationRequestsTable.reviewedAt,
        reviewedByUserId: accountDeactivationRequestsTable.reviewedByUserId,
        reviewerNote: accountDeactivationRequestsTable.reviewerNote,
        userName: usersTable.name,
        userEmail: usersTable.email,
        organizationName: organizationsTable.name,
      })
      .from(accountDeactivationRequestsTable)
      .innerJoin(
        usersTable,
        eq(accountDeactivationRequestsTable.userId, usersTable.id),
      )
      .leftJoin(
        organizationsTable,
        eq(accountDeactivationRequestsTable.organizationId, organizationsTable.id),
      )
      .where(eq(accountDeactivationRequestsTable.id, id))
      .limit(1);

    return serializeDeactivationRequest(result);
  });
}

export async function createAgency(input: {
  name: string;
  email: string;
  plan: "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  aiQuota: number;
  businessesLimit: number;
  createdByUserId: string;
  expiresInDays?: number;
  publicOrigin?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const [existingOwner] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existingOwner) throw new AdminOwnerAlreadyExistsError(email);

  const result = await db.transaction(async (tx) => {
    const slug = await generateUniqueOrgSlug(input.name, tx);
    const [organization] = await tx
      .insert(organizationsTable)
      .values({
        name: input.name.trim(),
        slug,
        plan: input.plan,
        subscriptionStatus: input.subscriptionStatus,
        aiQuota: input.aiQuota,
        businessesLimit: input.businessesLimit,
        startDate: new Date(),
      })
      .returning();

    const token = randomBytes(32).toString("base64url");
    const [invitation] = await tx
      .insert(agencyInvitationsTable)
      .values({
        organizationId: organization.id,
        createdByUserId: input.createdByUserId,
        email,
        tokenHash: hashToken(token),
        expiresAt: invitationExpiry(input.expiresInDays),
      })
      .returning();

    return {
      organization: {
        ...organization,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        startDate: iso(organization.startDate),
        renewalDate: iso(organization.renewalDate),
        expiryDate: iso(organization.expiryDate),
      },
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        signupPath: `/agency/join/${token}`,
      },
    };
  });
  const delivery = input.publicOrigin
    ? await sendAgencyOwnerInvitationEmail({
        to: result.invitation.email,
        agencyName: result.organization.name,
        expiresAt: result.invitation.expiresAt,
        joinUrl: `${input.publicOrigin}${result.invitation.signupPath}`,
      })
    : { sent: false, error: "Public app origin is unavailable." };
  return {
    ...result,
    invitation: { ...result.invitation, delivery },
  };
}

export async function updateAgency(
  id: string,
  updates: Partial<{
    status: "ACTIVE" | "SUSPENDED";
    plan: "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";
    subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    aiQuota: number;
    businessesLimit: number;
  }>,
) {
  const [organization] = await db
    .update(organizationsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizationsTable.id, id))
    .returning();
  if (!organization) throw new AdminAgencyNotFoundError(id);
  return {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    startDate: iso(organization.startDate),
    renewalDate: iso(organization.renewalDate),
    expiryDate: iso(organization.expiryDate),
  };
}

export async function createAgencyInvitation(
  organizationId: string,
  createdByUserId: string,
  email: string,
  expiresInDays?: number,
  publicOrigin?: string,
) {
  const [organization] = await db
    .select({
      id: organizationsTable.id,
      status: organizationsTable.status,
      name: organizationsTable.name,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  if (!organization) throw new AdminAgencyNotFoundError(organizationId);

  const normalizedEmail = email.trim().toLowerCase();
  await db
    .update(agencyInvitationsTable)
    .set({ status: "REVOKED" })
    .where(
      and(
        eq(agencyInvitationsTable.organizationId, organizationId),
        eq(agencyInvitationsTable.email, normalizedEmail),
        eq(agencyInvitationsTable.status, "PENDING"),
      ),
    );
  const invitation = await createInvitation(
    organizationId,
    createdByUserId,
    normalizedEmail,
    expiresInDays,
  );
  const delivery = publicOrigin
    ? await sendAgencyOwnerInvitationEmail({
        to: invitation.email,
        agencyName: organization.name,
        expiresAt: invitation.expiresAt,
        joinUrl: `${publicOrigin}${invitation.signupPath}`,
      })
    : { sent: false, error: "Public app origin is unavailable." };
  return { ...invitation, delivery };
}

export async function revokeAgencyInvitation(id: string) {
  const [invitation] = await db
    .update(agencyInvitationsTable)
    .set({ status: "REVOKED" })
    .where(
      and(
        eq(agencyInvitationsTable.id, id),
        eq(agencyInvitationsTable.status, "PENDING"),
      ),
    )
    .returning();
  if (!invitation) throw new AdminInvitationNotFoundError();
  return {
    id: invitation.id,
    status: invitation.status,
  };
}

export async function getPublicAgencyInvitation(token: string) {
  const [invitation] = await db
    .select({
      id: agencyInvitationsTable.id,
      email: agencyInvitationsTable.email,
      expiresAt: agencyInvitationsTable.expiresAt,
      organizationName: organizationsTable.name,
    })
    .from(agencyInvitationsTable)
    .innerJoin(
      organizationsTable,
      eq(agencyInvitationsTable.organizationId, organizationsTable.id),
    )
    .where(
      and(
        eq(agencyInvitationsTable.tokenHash, hashToken(token)),
        eq(agencyInvitationsTable.status, "PENDING"),
        eq(organizationsTable.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!invitation || invitation.expiresAt <= new Date()) return null;
  return {
    id: invitation.id,
    email: invitation.email,
    organizationName: invitation.organizationName,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}