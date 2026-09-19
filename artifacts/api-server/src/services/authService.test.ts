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
  getEmailPreferences,
  getOrCreateUserForClerkId,
  updateEmailPreferences,
} from "./authService.ts";

/**
 * Coverage for the invitation-only provisioning model: a brand-new Clerk
 * user is only ever attached to the Organization that invited them (via an
 * active `agency_invitations` row created by `createAgency`), never
 * auto-provisioned into a fresh org.
 *
 * Two concurrent first-login requests for the same brand-new Clerk user (or
 * several different invited users logging in at once) used to be able to
 * race the initial existence check against the eventual insert. This is
 * closed in two layers:
 *  1. A Postgres advisory lock keyed on the Clerk user id serializes
 *     concurrent provisioning attempts for the *same* user, so the loser
 *     waits, re-reads, and reuses the row the winner just committed.
 *  2. A retry loop catches a unique-constraint violation that slips through
 *     anyway, instead of surfacing a raw 500 to the client.
 */

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

test("rebinds an existing account for an allowlisted email without changing its tenant", async () => {
  const fixture = await createAgencyFixture(testAdminId, "allowlisted-rebind");
  const email = fixture.invitation.email;
  const legacyClerkUserId = `user_legacy_${runId}`;
  const replacementClerkUserId = `user_replacement_${runId}`;
  const originalSuperAdminEmails = process.env.SUPER_ADMIN_EMAILS;
  process.env.SUPER_ADMIN_EMAILS = [
    originalSuperAdminEmails,
    email,
  ].filter(Boolean).join(",");

  try {
    const [existing] = await db
      .insert(usersTable)
      .values({
        organizationId: fixture.organization.id,
        clerkUserId: legacyClerkUserId,
        name: "Existing Owner",
        email,
        role: "OWNER",
        status: "ACTIVE",
      })
      .returning();
    createdUserIds.push(existing.id);
    registerFakeClerkUser(
      replacementClerkUserId,
      "Replacement Clerk Super Admin",
      email,
    );

    const rebound = await getOrCreateUserForClerkId(replacementClerkUserId);

    assert.equal(rebound.id, existing.id);
    assert.equal(rebound.clerkUserId, replacementClerkUserId);
    assert.equal(rebound.organizationId, fixture.organization.id);
    assert.equal(rebound.role, "OWNER");
    const [stored] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, existing.id));
    assert.equal(stored.clerkUserId, replacementClerkUserId);
  } finally {
    if (originalSuperAdminEmails === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalSuperAdminEmails;
    }
  }
});

test("concurrent first-login requests for the same brand-new Clerk user provision exactly one account", async () => {
  const fixture = await createAgencyFixture(testAdminId, "race-same");
  const clerkUserId = `user_race_same_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    "Race Same Owner",
    fixture.invitation.email,
  );

  const results = await Promise.all(
    Array.from({ length: 5 }, () => getOrCreateUserForClerkId(clerkUserId)),
  );

  const userIds = new Set(results.map((u) => u.id));
  assert.equal(userIds.size, 1, "all concurrent calls resolve to one user");
  assert.equal(
    results[0].organizationId,
    fixture.organization.id,
    "user was attached to the inviting organization",
  );
  createdUserIds.push(results[0].id);

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(rows.length, 1, "exactly one user row was inserted");

  const [acceptedInvitation] = await db
    .select()
    .from(agencyInvitationsTable)
    .where(eq(agencyInvitationsTable.id, fixture.invitation.id));
  assert.equal(
    acceptedInvitation.status,
    "ACCEPTED",
    "the invitation was accepted exactly once despite the concurrent calls",
  );
});

test("concurrent first-logins for different invited users each join the organization that invited them", async () => {
  const fixtures = await Promise.all(
    [0, 1, 2].map((i) =>
      createAgencyFixture(testAdminId, `race-collide-${i}`),
    ),
  );
  const clerkUserIds = fixtures.map(
    (_, i) => `user_race_collide_${i}_${runId}`,
  );

  fixtures.forEach((fixture, i) => {
    registerFakeClerkUser(
      clerkUserIds[i],
      "Race Collide Owner",
      fixture.invitation.email,
    );
  });

  const results = await Promise.all(
    clerkUserIds.map((id) => getOrCreateUserForClerkId(id)),
  );
  for (const user of results) createdUserIds.push(user.id);

  const userIds = new Set(results.map((u) => u.id));
  assert.equal(userIds.size, 3, "each user got its own row");

  results.forEach((user, i) => {
    assert.equal(
      user.organizationId,
      fixtures[i].organization.id,
      "each user joined the organization that invited them, not a different one",
    );
  });
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

test("email preferences default to enabled and persist optional changes", async () => {
  const fixture = await createAgencyFixture(testAdminId, "email-preferences");
  const clerkUserId = `user_email_preferences_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    "Email Preference Owner",
    fixture.invitation.email,
  );

  const user = await getOrCreateUserForClerkId(clerkUserId);
  createdUserIds.push(user.id);

  assert.deepEqual(await getEmailPreferences(user.id), {
    productUpdates: true,
    releaseAnnouncements: true,
    securityMessages: true,
    accountServiceMessages: true,
  });

  assert.deepEqual(
    await updateEmailPreferences(user.id, {
      productUpdates: false,
      releaseAnnouncements: false,
    }),
    {
      productUpdates: false,
      releaseAnnouncements: false,
      securityMessages: true,
      accountServiceMessages: true,
    },
  );

  assert.deepEqual(await getEmailPreferences(user.id), {
    productUpdates: false,
    releaseAnnouncements: false,
    securityMessages: true,
    accountServiceMessages: true,
  });
});
