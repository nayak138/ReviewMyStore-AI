import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import {
  businessesTable,
  businessMembershipsTable,
  db,
  organizationsTable,
  teamAuditEventsTable,
  teamInvitationsTable,
  usersTable,
  type User,
} from "@workspace/db";
import { sendTeamInvitationEmail } from "./notificationService";
import { assertTeamSchemaReady } from "./teamSchemaReadiness";

export type TeamPermission = "NONE" | "VIEW" | "MANAGE";
export type AnalyticsPermission = "NONE" | "VIEW";
export type TeamGrants = {
  campaignsPermission: TeamPermission;
  reviewInboxPermission: TeamPermission;
  feedbackPermission: TeamPermission;
  socialMediaPermission: TeamPermission;
  analyticsPermission: AnalyticsPermission;
};

const DEFAULT_INVITATION_DAYS = 14;
const MAX_TEAM_SEATS = 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function expiry(days = DEFAULT_INVITATION_DAYS) {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 90);
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
}

function hasGrant(grants: TeamGrants) {
  return Object.values(grants).some((value) => value !== "NONE");
}

function grantsFrom(row: TeamGrants) {
  return {
    campaignsPermission: row.campaignsPermission,
    reviewInboxPermission: row.reviewInboxPermission,
    feedbackPermission: row.feedbackPermission,
    socialMediaPermission: row.socialMediaPermission,
    analyticsPermission: row.analyticsPermission,
  };
}

export class TeamForbiddenError extends Error {}
export class TeamBusinessNotFoundError extends Error {}
export class TeamInvitationNotFoundError extends Error {}
export class TeamInvitationConflictError extends Error {}
export class TeamSeatLimitError extends Error {}
export class TeamInvitationEmailMismatchError extends Error {}

function assertOwner(user: User) {
  if (user.role !== "OWNER" || !user.organizationId) {
    throw new TeamForbiddenError("Only an agency owner can manage business teams.");
  }
}

function serializeInvitation(row: typeof teamInvitationsTable.$inferSelect, token?: string) {
  return {
    id: row.id,
    businessId: row.businessId,
    email: row.email,
    invitedName: row.invitedName,
    status: row.status,
    ...grantsFrom(row),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    deliveryStatus: row.deliveryStatus,
    deliveryError: row.deliveryError,
    ...(token ? { joinPath: `/team/join/${token}` } : {}),
  };
}

export async function listTeam(businessId: string, owner: User) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, owner.organizationId!),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);
  if (!business) throw new TeamBusinessNotFoundError("Business not found.");

  const [members, invitations] = await Promise.all([
    db
      .select({
        id: businessMembershipsTable.id,
        userId: businessMembershipsTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        removedAt: businessMembershipsTable.removedAt,
        campaignsPermission: businessMembershipsTable.campaignsPermission,
        reviewInboxPermission: businessMembershipsTable.reviewInboxPermission,
        feedbackPermission: businessMembershipsTable.feedbackPermission,
        socialMediaPermission: businessMembershipsTable.socialMediaPermission,
        analyticsPermission: businessMembershipsTable.analyticsPermission,
        createdAt: businessMembershipsTable.createdAt,
      })
      .from(businessMembershipsTable)
      .innerJoin(usersTable, eq(usersTable.id, businessMembershipsTable.userId))
      .where(
        and(
          eq(businessMembershipsTable.businessId, businessId),
          eq(businessMembershipsTable.organizationId, owner.organizationId!),
          isNull(businessMembershipsTable.removedAt),
        ),
      ),
    db
      .select()
      .from(teamInvitationsTable)
      .where(
        and(
          eq(teamInvitationsTable.businessId, businessId),
          eq(teamInvitationsTable.organizationId, owner.organizationId!),
          eq(teamInvitationsTable.status, "PENDING"),
        ),
      ),
  ]);

  return {
    businessId,
    seatLimit: MAX_TEAM_SEATS,
    members: members.map((member) => ({
      ...member,
      createdAt: member.createdAt.toISOString(),
      ...grantsFrom(member),
    })),
    invitations: invitations.map((invite) => serializeInvitation(invite)),
    seatsUsed: members.length + invitations.filter((invite) => invite.expiresAt > new Date()).length,
  };
}

async function writeAudit(
  executor: { insert: typeof db.insert },
  values: {
    organizationId: string;
    businessId: string;
    actorUserId?: string;
    targetUserId?: string;
    invitationId?: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  },
) {
  await executor.insert(teamAuditEventsTable).values(values);
}

export async function createTeamInvitation(input: {
  owner: User;
  businessId: string;
  email: string;
  invitedName?: string;
  grants: TeamGrants;
  expiresInDays?: number;
  publicOrigin: string;
}) {
  assertOwner(input.owner);
  await assertTeamSchemaReady();
  if (!hasGrant(input.grants)) {
    throw new TeamInvitationConflictError("Select at least one feature permission.");
  }
  const email = normalizeEmail(input.email);
  const token = randomBytes(32).toString("base64url");
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.businessId}))`,
    );
    const [business] = await tx
      .select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, input.businessId),
          eq(businessesTable.organizationId, input.owner.organizationId!),
          eq(businessesTable.status, "ACTIVE"),
          isNull(businessesTable.deletedAt),
          isNull(businessesTable.archivedAt),
        ),
      )
      .limit(1);
    if (!business) throw new TeamBusinessNotFoundError("Business not found or unavailable.");

    const [existingMember] = await tx
      .select({ id: businessMembershipsTable.id })
      .from(businessMembershipsTable)
      .innerJoin(usersTable, eq(usersTable.id, businessMembershipsTable.userId))
      .where(
        and(
          eq(businessMembershipsTable.businessId, input.businessId),
          eq(businessMembershipsTable.organizationId, input.owner.organizationId!),
          eq(usersTable.email, email),
          isNull(businessMembershipsTable.removedAt),
        ),
      )
      .limit(1);
    if (existingMember) throw new TeamInvitationConflictError("This person already has access to the business.");

    const [existingInvite] = await tx
      .select({ id: teamInvitationsTable.id })
      .from(teamInvitationsTable)
      .where(
        and(
          eq(teamInvitationsTable.businessId, input.businessId),
          eq(teamInvitationsTable.email, email),
          eq(teamInvitationsTable.status, "PENDING"),
          gt(teamInvitationsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (existingInvite) throw new TeamInvitationConflictError("An invitation is already pending for this email.");

    const [memberCount] = await tx
      .select({ value: count() })
      .from(businessMembershipsTable)
      .where(
        and(
          eq(businessMembershipsTable.businessId, input.businessId),
          isNull(businessMembershipsTable.removedAt),
        ),
      );
    const [pendingCount] = await tx
      .select({ value: count() })
      .from(teamInvitationsTable)
      .where(
        and(
          eq(teamInvitationsTable.businessId, input.businessId),
          eq(teamInvitationsTable.status, "PENDING"),
          gt(teamInvitationsTable.expiresAt, new Date()),
        ),
      );
    if (Number(memberCount.value) + Number(pendingCount.value) >= MAX_TEAM_SEATS) {
      throw new TeamSeatLimitError("This business has reached its five teammate seat limit.");
    }

    const [invitation] = await tx
      .insert(teamInvitationsTable)
      .values({
        organizationId: input.owner.organizationId!,
        businessId: input.businessId,
        invitedByUserId: input.owner.id,
        email,
        invitedName: input.invitedName?.trim() || null,
        tokenHash: hashToken(token),
        expiresAt: expiry(input.expiresInDays),
        ...input.grants,
      })
      .returning();
    await writeAudit(tx, {
      organizationId: input.owner.organizationId!,
      businessId: input.businessId,
      actorUserId: input.owner.id,
      invitationId: invitation.id,
      eventType: "INVITATION_CREATED",
      metadata: { email },
    });
    return { invitation, businessName: business.name };
  });

  const emailResult = await sendTeamInvitationEmail({
    to: result.invitation.email,
    agencyName: (await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.owner.organizationId!))
      .limit(1))[0]?.name ?? "your agency",
    businessName: result.businessName,
    inviterName: input.owner.name,
    invitedEmail: result.invitation.email,
    grants: input.grants,
    expiresAt: result.invitation.expiresAt.toISOString(),
    joinUrl: `${input.publicOrigin}/team/join/${token}`,
  });
  await db
    .update(teamInvitationsTable)
    .set({
      deliveryStatus: emailResult.sent ? "SENT" : "FAILED",
      deliveryError: emailResult.sent ? null : (emailResult.error ?? "Email delivery failed."),
      updatedAt: new Date(),
    })
    .where(eq(teamInvitationsTable.id, result.invitation.id));

  return {
    invitation: serializeInvitation(
      {
        ...result.invitation,
        deliveryStatus: emailResult.sent ? "SENT" : "FAILED",
        deliveryError: emailResult.sent ? null : (emailResult.error ?? "Email delivery failed."),
      },
      token,
    ),
    delivery: emailResult,
  };
}

export async function getPublicTeamInvitation(token: string) {
  await assertTeamSchemaReady();
  const [row] = await db
    .select({
      invitation: teamInvitationsTable,
      businessName: businessesTable.name,
      organizationName: organizationsTable.name,
    })
    .from(teamInvitationsTable)
    .innerJoin(businessesTable, eq(businessesTable.id, teamInvitationsTable.businessId))
    .innerJoin(organizationsTable, eq(organizationsTable.id, teamInvitationsTable.organizationId))
    .where(
      and(
        eq(teamInvitationsTable.tokenHash, hashToken(token)),
        eq(teamInvitationsTable.status, "PENDING"),
        gt(teamInvitationsTable.expiresAt, new Date()),
        eq(organizationsTable.status, "ACTIVE"),
        eq(businessesTable.status, "ACTIVE"),
        isNull(businessesTable.archivedAt),
        isNull(businessesTable.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.invitation.id,
    email: row.invitation.email,
    businessId: row.invitation.businessId,
    businessName: row.businessName,
    organizationName: row.organizationName,
    invitedName: row.invitation.invitedName,
    ...grantsFrom(row.invitation),
    expiresAt: row.invitation.expiresAt.toISOString(),
  };
}

export async function acceptTeamInvitation(token: string, user: User) {
  if (!user.organizationId || user.role !== "TEAM_MEMBER") {
    throw new TeamForbiddenError("This account cannot join a business team.");
  }
  await assertTeamSchemaReady();
  const organizationId = user.organizationId;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${token}))`);
    const [invite] = await tx
      .select()
      .from(teamInvitationsTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, teamInvitationsTable.organizationId))
      .innerJoin(businessesTable, eq(businessesTable.id, teamInvitationsTable.businessId))
      .where(
        and(
          eq(teamInvitationsTable.tokenHash, hashToken(token)),
          eq(teamInvitationsTable.status, "PENDING"),
          gt(teamInvitationsTable.expiresAt, new Date()),
          eq(teamInvitationsTable.organizationId, organizationId),
          eq(organizationsTable.status, "ACTIVE"),
          eq(businessesTable.status, "ACTIVE"),
          isNull(businessesTable.archivedAt),
          isNull(businessesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!invite) throw new TeamInvitationNotFoundError("This invitation is invalid, expired, revoked, or unavailable.");
    if (normalizeEmail(user.email) !== normalizeEmail(invite.team_invitations.email)) {
      throw new TeamInvitationEmailMismatchError("Sign in with the invited email address to accept this invitation.");
    }
    const [existing] = await tx
      .select({ id: businessMembershipsTable.id })
      .from(businessMembershipsTable)
      .where(
        and(
          eq(businessMembershipsTable.businessId, invite.team_invitations.businessId),
          eq(businessMembershipsTable.userId, user.id),
          isNull(businessMembershipsTable.removedAt),
        ),
      )
      .limit(1);
    if (!existing) {
      const [memberCount] = await tx
        .select({ value: count() })
        .from(businessMembershipsTable)
        .where(
          and(
            eq(businessMembershipsTable.businessId, invite.team_invitations.businessId),
            isNull(businessMembershipsTable.removedAt),
          ),
        );
      if (Number(memberCount.value) >= MAX_TEAM_SEATS) {
        throw new TeamSeatLimitError("No teammate seats remain for this business.");
      }
      await tx.insert(businessMembershipsTable).values({
        organizationId: invite.team_invitations.organizationId,
        businessId: invite.team_invitations.businessId,
        userId: user.id,
        ...grantsFrom(invite.team_invitations),
      });
    }
    await tx
      .update(teamInvitationsTable)
      .set({ status: "ACCEPTED", acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(teamInvitationsTable.id, invite.team_invitations.id));
    await writeAudit(tx, {
      organizationId: invite.team_invitations.organizationId,
      businessId: invite.team_invitations.businessId,
      actorUserId: user.id,
      targetUserId: user.id,
      invitationId: invite.team_invitations.id,
      eventType: "INVITATION_ACCEPTED",
    });
    return { businessId: invite.team_invitations.businessId };
  });
}

export async function updateTeamMember(
  membershipId: string,
  owner: User,
  grants: TeamGrants,
) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  if (!hasGrant(grants)) throw new TeamInvitationConflictError("Select at least one feature permission.");
  const [member] = await db
    .update(businessMembershipsTable)
    .set({ ...grants, updatedAt: new Date() })
    .where(
      and(
        eq(businessMembershipsTable.id, membershipId),
        eq(businessMembershipsTable.organizationId, owner.organizationId!),
        isNull(businessMembershipsTable.removedAt),
      ),
    )
    .returning();
  if (!member) throw new TeamInvitationNotFoundError("Team member not found.");
  await writeAudit(db, {
    organizationId: owner.organizationId!,
    businessId: member.businessId,
    actorUserId: owner.id,
    targetUserId: member.userId,
    eventType: "MEMBER_PERMISSIONS_UPDATED",
    metadata: grants,
  });
  return member;
}

export async function removeTeamMember(membershipId: string, owner: User) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  const [member] = await db
    .update(businessMembershipsTable)
    .set({ removedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(businessMembershipsTable.id, membershipId),
        eq(businessMembershipsTable.organizationId, owner.organizationId!),
        isNull(businessMembershipsTable.removedAt),
      ),
    )
    .returning();
  if (!member) throw new TeamInvitationNotFoundError("Team member not found.");
  await writeAudit(db, {
    organizationId: owner.organizationId!,
    businessId: member.businessId,
    actorUserId: owner.id,
    targetUserId: member.userId,
    eventType: "MEMBER_REMOVED",
  });
  return { id: member.id, status: "REMOVED" as const };
}

export async function revokeTeamInvitation(invitationId: string, owner: User) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  const [invite] = await db
    .update(teamInvitationsTable)
    .set({ status: "REVOKED", revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(teamInvitationsTable.id, invitationId),
        eq(teamInvitationsTable.organizationId, owner.organizationId!),
        eq(teamInvitationsTable.status, "PENDING"),
      ),
    )
    .returning();
  if (!invite) throw new TeamInvitationNotFoundError("Invitation not found or no longer active.");
  await writeAudit(db, {
    organizationId: owner.organizationId!,
    businessId: invite.businessId,
    actorUserId: owner.id,
    invitationId,
    eventType: "INVITATION_REVOKED",
  });
  return { id: invitationId, status: invite.status };
}

export async function updatePendingInvitation(
  invitationId: string,
  owner: User,
  grants: TeamGrants,
) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  if (!hasGrant(grants)) throw new TeamInvitationConflictError("Select at least one feature permission.");
  const [invite] = await db
    .update(teamInvitationsTable)
    .set({ ...grants, updatedAt: new Date() })
    .where(
      and(
        eq(teamInvitationsTable.id, invitationId),
        eq(teamInvitationsTable.organizationId, owner.organizationId!),
        eq(teamInvitationsTable.status, "PENDING"),
      ),
    )
    .returning();
  if (!invite) throw new TeamInvitationNotFoundError("Invitation not found or no longer active.");
  await writeAudit(db, {
    organizationId: owner.organizationId!,
    businessId: invite.businessId,
    actorUserId: owner.id,
    invitationId,
    eventType: "INVITATION_PERMISSIONS_UPDATED",
    metadata: grants,
  });
  return serializeInvitation(invite);
}

export async function resendTeamInvitation(
  invitationId: string,
  owner: User,
  publicOrigin: string,
) {
  assertOwner(owner);
  await assertTeamSchemaReady();
  const token = randomBytes(32).toString("base64url");
  const result = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(teamInvitationsTable)
      .where(
        and(
          eq(teamInvitationsTable.id, invitationId),
          eq(teamInvitationsTable.organizationId, owner.organizationId!),
          eq(teamInvitationsTable.status, "PENDING"),
        ),
      )
      .limit(1);
    if (!invite) throw new TeamInvitationNotFoundError("Invitation not found or no longer active.");
    if (
      invite.lastResentAt &&
      invite.lastResentAt.getTime() > Date.now() - 60_000
    ) {
      throw new TeamInvitationConflictError(
        "Please wait before resending this invitation.",
      );
    }
    const [business] = await tx
      .select({ name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, invite.businessId))
      .limit(1);
    const [updated] = await tx
      .update(teamInvitationsTable)
      .set({
        tokenHash: hashToken(token),
        expiresAt: expiry(),
        deliveryStatus: "NOT_SENT",
        deliveryError: null,
        lastResentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teamInvitationsTable.id, invitationId))
      .returning();
    await writeAudit(tx, {
      organizationId: owner.organizationId!,
      businessId: invite.businessId,
      actorUserId: owner.id,
      invitationId,
      eventType: "INVITATION_ROTATED",
    });
    return { invite: updated, businessName: business?.name ?? "your business" };
  });
  const [organization] = await db
    .select({ name: organizationsTable.name })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, owner.organizationId!))
    .limit(1);
  const delivery = await sendTeamInvitationEmail({
    to: result.invite.email,
    agencyName: organization?.name ?? "your agency",
    businessName: result.businessName,
    inviterName: owner.name,
    invitedEmail: result.invite.email,
    grants: grantsFrom(result.invite),
    expiresAt: result.invite.expiresAt.toISOString(),
    joinUrl: `${publicOrigin}/team/join/${token}`,
  });
  await db
    .update(teamInvitationsTable)
    .set({
      deliveryStatus: delivery.sent ? "SENT" : "FAILED",
      deliveryError: delivery.sent ? null : (delivery.error ?? "Email delivery failed."),
      updatedAt: new Date(),
    })
    .where(eq(teamInvitationsTable.id, invitationId));
  return {
    invitation: serializeInvitation({
      ...result.invite,
      deliveryStatus: delivery.sent ? "SENT" : "FAILED",
      deliveryError: delivery.sent ? null : (delivery.error ?? "Email delivery failed."),
    }, token),
    delivery,
  };
}