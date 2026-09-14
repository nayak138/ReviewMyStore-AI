import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import {
  agencyInvitationsTable,
  db,
  organizationsTable,
  pool,
  usersTable,
} from "@workspace/db";
import {
  AdminInvitationNotFoundError,
  createAgency,
  getPublicAgencyInvitation,
  revokeAgencyInvitation,
} from "./adminService.ts";
import {
  AgencyInvitationRequiredError,
  getOrCreateUserForClerkId,
} from "./authService.ts";

const runId = randomUUID().slice(0, 8);
const createdOrganizationIds: string[] = [];
const createdUserIds: string[] = [];
const fakeClerkUsers = new Map<string, FakeClerkUser>();
const originalGetUser = clerkClient.users.getUser.bind(clerkClient.users);

type FakeClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
};

clerkClient.users.getUser = (async (id: string) => {
  const fake = fakeClerkUsers.get(id);
  if (!fake) throw new Error(`No fake Clerk user registered for ${id}`);
  return fake as unknown as Awaited<
    ReturnType<typeof clerkClient.users.getUser>
  >;
}) as typeof clerkClient.users.getUser;

function registerFakeClerkUser(id: string, name: string, email: string) {
  fakeClerkUsers.set(id, {
    id,
    firstName: name,
    lastName: null,
    primaryEmailAddressId: "email_1",
    emailAddresses: [{ id: "email_1", emailAddress: email }],
  });
}

async function createTestAdmin() {
  const [admin] = await db
    .insert(usersTable)
    .values({
      organizationId: null,
      clerkUserId: `user_test_admin_${runId}`,
      name: "Invitation Test Admin",
      email: `test-admin-${runId}@example.com`,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    })
    .returning();
  createdUserIds.push(admin.id);
  return admin;
}

async function createAgencyFixture(adminId: string, suffix: string) {
  const result = await createAgency({
    name: `Invitation Test Agency ${runId} ${suffix}`,
    email: `owner-${runId}-${suffix}@example.com`,
    plan: "STARTER",
    subscriptionStatus: "TRIALING",
    aiQuota: 50,
    businessesLimit: 2,
    createdByUserId: adminId,
    expiresInDays: 14,
  });
  createdOrganizationIds.push(result.organization.id);
  return result;
}

let testAdminId: string;

before(async () => {
  testAdminId = (await createTestAdmin()).id;
});

after(async () => {
  clerkClient.users.getUser = originalGetUser;
  for (const organizationId of createdOrganizationIds) {
    await db
      .delete(agencyInvitationsTable)
      .where(eq(agencyInvitationsTable.organizationId, organizationId));
  }
  for (const userId of createdUserIds) {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
  for (const organizationId of createdOrganizationIds) {
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, organizationId));
  }
  await pool.end();
});

test("first login attaches the invited owner to the intended agency and consumes the link", async () => {
  const fixture = await createAgencyFixture(testAdminId, "valid");
  const clerkUserId = `user_invited_valid_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    "Invited Owner",
    fixture.invitation.email,
  );

  const user = await getOrCreateUserForClerkId(clerkUserId);
  createdUserIds.push(user.id);

  assert.equal(user.role, "OWNER");
  assert.equal(user.organizationId, fixture.organization.id);

  const [invitation] = await db
    .select()
    .from(agencyInvitationsTable)
    .where(eq(agencyInvitationsTable.id, fixture.invitation.id));
  assert.equal(invitation.status, "ACCEPTED");
  assert.equal(await getPublicAgencyInvitation(fixture.invitation.signupPath.split("/").pop()!), null);
});

test("expired invitations cannot be used for public lookup or first login", async () => {
  const fixture = await createAgencyFixture(testAdminId, "expired");
  await db
    .update(agencyInvitationsTable)
    .set({ expiresAt: new Date(0) })
    .where(eq(agencyInvitationsTable.id, fixture.invitation.id));

  const token = fixture.invitation.signupPath.split("/").pop()!;
  assert.equal(await getPublicAgencyInvitation(token), null);

  const clerkUserId = `user_invited_expired_${runId}`;
  registerFakeClerkUser(clerkUserId, "Expired Owner", fixture.invitation.email);
  await assert.rejects(
    () => getOrCreateUserForClerkId(clerkUserId),
    AgencyInvitationRequiredError,
  );
});

test("revoked invitations cannot be used", async () => {
  const fixture = await createAgencyFixture(testAdminId, "revoked");
  const token = fixture.invitation.signupPath.split("/").pop()!;
  await revokeAgencyInvitation(fixture.invitation.id);

  assert.equal(await getPublicAgencyInvitation(token), null);
  const clerkUserId = `user_invited_revoked_${runId}`;
  registerFakeClerkUser(clerkUserId, "Revoked Owner", fixture.invitation.email);
  await assert.rejects(
    () => getOrCreateUserForClerkId(clerkUserId),
    AgencyInvitationRequiredError,
  );
});

test("a second use of an accepted invitation is rejected", async () => {
  const fixture = await createAgencyFixture(testAdminId, "one-time");
  const clerkUserId = `user_invited_once_${runId}`;
  registerFakeClerkUser(clerkUserId, "One Time Owner", fixture.invitation.email);
  const firstUser = await getOrCreateUserForClerkId(clerkUserId);
  createdUserIds.push(firstUser.id);

  const secondClerkUserId = `user_invited_once_second_${runId}`;
  registerFakeClerkUser(
    secondClerkUserId,
    "Second Owner",
    fixture.invitation.email,
  );
  await assert.rejects(
    () => getOrCreateUserForClerkId(secondClerkUserId),
    AgencyInvitationRequiredError,
  );

  await assert.rejects(
    () => revokeAgencyInvitation(fixture.invitation.id),
    AdminInvitationNotFoundError,
  );
});

test("uninvited first login is blocked instead of creating a new organization", async () => {
  const clerkUserId = `user_uninvited_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    "Uninvited User",
    `uninvited-${runId}@example.com`,
  );

  await assert.rejects(
    () => getOrCreateUserForClerkId(clerkUserId),
    AgencyInvitationRequiredError,
  );

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(user, undefined);
});