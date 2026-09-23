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
  type User,
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
  getUserTeamAccess,
  updateEmailPreferences,
  VerifiedEmailRequiredError,
} from "./authService.ts";
import {
  expectedEnums,
  expectedIndexes,
  isTeamSchemaCatalogReady,
  requiredColumns,
  requiredForeignKeys,
  requiredPrimaryKeyTables,
  setTeamSchemaReadinessProbeForTests,
  type TeamSchemaCatalog,
  TeamSchemaNotReadyError,
} from "./teamSchemaReadiness.ts";
import { createTeamInvitation } from "./teamService.ts";

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
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: "verified" | "unverified" };
  }>;
};

clerkClient.users.getUser = (async (id: string) => {
  const fake = fakeClerkUsers.get(id);
  if (!fake) throw new Error(`No fake Clerk user registered for ${id}`);
  return fake as unknown as Awaited<
    ReturnType<typeof clerkClient.users.getUser>
  >;
}) as typeof clerkClient.users.getUser;

function registerFakeClerkUser(
  id: string,
  name: string,
  email: string,
  verified = true,
) {
  fakeClerkUsers.set(id, {
    id,
    firstName: name,
    lastName: null,
    primaryEmailAddressId: "email_1",
    emailAddresses: [
      {
        id: "email_1",
        emailAddress: email,
        verification: { status: verified ? "verified" : "unverified" },
      },
    ],
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

function completeTeamSchemaCatalog(): TeamSchemaCatalog {
  return {
    enums: [...expectedEnums.entries()].map(([enum_name, labels]) => ({
      enum_name,
      labels,
    })),
    columns: requiredColumns.map(
      ([table_name, column_name, data_type, udt_name, is_nullable]) => ({
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
      }),
    ),
    indexes: expectedIndexes.map(
      ([table_name, index_name, is_unique, columns, requiredPredicate]) => ({
        table_name,
        index_name,
        is_unique,
        columns,
        predicate: requiredPredicate ? `status = '${requiredPredicate}'` : null,
      }),
    ),
    constraints: [
      ...requiredPrimaryKeyTables.map((table_name) => ({
        table_name,
        constraint_type: "p",
        foreign_table_name: null,
        local_columns: null,
        foreign_columns: null,
        delete_rule: null,
      })),
      ...requiredForeignKeys.map(
        ([
          table_name,
          local_columns,
          foreign_table_name,
          foreign_columns,
          delete_rule,
        ]) => ({
          table_name,
          constraint_type: "f",
          foreign_table_name,
          local_columns,
          foreign_columns,
          delete_rule,
        }),
      ),
    ],
  };
}

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

test("rebinds and promotes an existing account for an allowlisted email", async () => {
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
    assert.equal(rebound.organizationId, null);
    assert.equal(rebound.role, "SUPER_ADMIN");
    const [stored] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, existing.id));
    assert.equal(stored.clerkUserId, replacementClerkUserId);
    assert.equal(stored.organizationId, null);
    assert.equal(stored.role, "SUPER_ADMIN");
  } finally {
    if (originalSuperAdminEmails === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalSuperAdminEmails;
    }
  }
});

test("promotes an already-linked owner on their next authenticated request", async () => {
  const fixture = await createAgencyFixture(testAdminId, "allowlisted-existing");
  const email = fixture.invitation.email;
  const clerkUserId = `user_existing_allowlisted_${runId}`;
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
        clerkUserId,
        name: "Existing Allowlisted Owner",
        email,
        role: "OWNER",
        status: "ACTIVE",
      })
      .returning();
    createdUserIds.push(existing.id);

    const promoted = await getOrCreateUserForClerkId(clerkUserId);

    assert.equal(promoted.id, existing.id);
    assert.equal(promoted.role, "SUPER_ADMIN");
    assert.equal(promoted.organizationId, null);
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

test("an unverified primary email cannot claim an agency invitation", async () => {
  const fixture = await createAgencyFixture(testAdminId, "unverified-email");
  const clerkUserId = `user_invited_unverified_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    "Unverified Owner",
    fixture.invitation.email,
    false,
  );

  await assert.rejects(
    () => getOrCreateUserForClerkId(clerkUserId),
    VerifiedEmailRequiredError,
  );

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(user, undefined);
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

test("team invitation login is blocked without provisioning when team schema is unavailable", async () => {
  const clerkUserId = `user_team_schema_unavailable_${runId}`;
  const email = `team-schema-unavailable-${runId}@example.com`;
  registerFakeClerkUser(clerkUserId, "Unavailable Teammate", email);
  setTeamSchemaReadinessProbeForTests(async () => false);

  try {
    await assert.rejects(
      () =>
        getOrCreateUserForClerkId(clerkUserId, {
          teamInvitationToken: "invitation-token",
        }),
      TeamSchemaNotReadyError,
    );
  } finally {
    setTeamSchemaReadinessProbeForTests(undefined);
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(user, undefined);
});

test("team invitation login is blocked when a required index is missing", async () => {
  const clerkUserId = `user_team_missing_index_${runId}`;
  const email = `team-missing-index-${runId}@example.com`;
  registerFakeClerkUser(clerkUserId, "Missing Index Teammate", email);
  const incompleteCatalog = completeTeamSchemaCatalog();
  incompleteCatalog.indexes = incompleteCatalog.indexes.filter(
    (index) => index.index_name !== "team_invitations_business_idx",
  );
  assert.equal(isTeamSchemaCatalogReady(incompleteCatalog), false);
  setTeamSchemaReadinessProbeForTests(async () =>
    isTeamSchemaCatalogReady(incompleteCatalog),
  );

  try {
    await assert.rejects(
      () =>
        getOrCreateUserForClerkId(clerkUserId, {
          teamInvitationToken: "invitation-token",
        }),
      TeamSchemaNotReadyError,
    );
  } finally {
    setTeamSchemaReadinessProbeForTests(undefined);
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(user, undefined);
});

test("existing TEAM_MEMBER login is blocked when a required primary key is missing", async () => {
  const fixture = await createAgencyFixture(testAdminId, "team-member-missing-key");
  const clerkUserId = `user_team_missing_key_${runId}`;
  const [teamMember] = await db
    .insert(usersTable)
    .values({
      organizationId: fixture.organization.id,
      clerkUserId,
      name: "Missing Key Teammate",
      email: `team-missing-key-${runId}@example.com`,
      role: "TEAM_MEMBER",
      status: "ACTIVE",
    })
    .returning();
  createdUserIds.push(teamMember.id);
  registerFakeClerkUser(
    clerkUserId,
    "Missing Key Teammate",
    teamMember.email,
  );

  const incompleteCatalog = completeTeamSchemaCatalog();
  incompleteCatalog.constraints = incompleteCatalog.constraints.filter(
    (constraint) =>
      !(
        constraint.constraint_type === "p" &&
        constraint.table_name === "team_invitations"
      ),
  );
  assert.equal(isTeamSchemaCatalogReady(incompleteCatalog), false);
  setTeamSchemaReadinessProbeForTests(async () =>
    isTeamSchemaCatalogReady(incompleteCatalog),
  );

  try {
    await assert.rejects(
      () => getOrCreateUserForClerkId(clerkUserId),
      TeamSchemaNotReadyError,
    );
  } finally {
    setTeamSchemaReadinessProbeForTests(undefined);
  }
});

test("owner access does not depend on team schema readiness", async () => {
  setTeamSchemaReadinessProbeForTests(async () => false);
  try {
    assert.deepEqual(
      await getEmailPreferences(testAdminId),
      {
        productUpdates: true,
        releaseAnnouncements: true,
        securityMessages: true,
        accountServiceMessages: true,
      },
      "existing owner account services remain available",
    );
    assert.deepEqual(
      await getUserTeamAccess("owner-without-team-schema", "org-owner", "OWNER"),
      [],
    );
  } finally {
    setTeamSchemaReadinessProbeForTests(undefined);
  }
});

test("owner invitation mutations fail closed with an operator-safe readiness response", async () => {
  const owner = {
    id: "owner-without-team-schema",
    organizationId: "org-owner",
    role: "OWNER",
  } as User;
  setTeamSchemaReadinessProbeForTests(async () => false);

  try {
    await assert.rejects(
      () =>
        createTeamInvitation({
          owner,
          businessId: "business-without-team-schema",
          email: "teammate@example.com",
          grants: {
            campaignsPermission: "VIEW",
            reviewInboxPermission: "NONE",
            feedbackPermission: "NONE",
            socialMediaPermission: "NONE",
            analyticsPermission: "NONE",
          },
          publicOrigin: "https://example.com",
        }),
      (error: unknown) => {
        assert.ok(error instanceof TeamSchemaNotReadyError);
        assert.equal(error.status, 503);
        assert.equal(error.code, "TEAM_SCHEMA_NOT_READY");
        assert.match(error.message, /platform administrator/i);
        return true;
      },
    );
  } finally {
    setTeamSchemaReadinessProbeForTests(undefined);
  }
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
