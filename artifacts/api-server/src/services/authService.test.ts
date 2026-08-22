import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, pool, organizationsTable, usersTable } from "@workspace/db";
import { getOrCreateUserForClerkId } from "./authService.ts";

/**
 * Regression tests for the JIT-provisioning race: two concurrent first-login
 * requests for the same brand-new Clerk user (or two different brand-new
 * users whose names collide on the same org slug) used to crash with an
 * unhandled unique-constraint violation instead of resolving cleanly.
 *
 * `clerkClient.users.getUser` is monkey-patched directly (it's a plain
 * mutable object, no module-mocking needed) so these tests never call out to
 * Clerk; the real development database is used with created rows cleaned up
 * afterwards.
 */

const runId = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

type FakeClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
};

const fakeClerkUsers = new Map<string, FakeClerkUser>();
const originalGetUser = clerkClient.users.getUser.bind(clerkClient.users);

clerkClient.users.getUser = (async (id: string) => {
  const fake = fakeClerkUsers.get(id);
  if (!fake) {
    throw new Error(`No fake Clerk user registered for ${id}`);
  }
  return fake as unknown as Awaited<
    ReturnType<typeof clerkClient.users.getUser>
  >;
}) as typeof clerkClient.users.getUser;

function registerFakeClerkUser(
  clerkUserId: string,
  name: string,
  email: string,
): void {
  fakeClerkUsers.set(clerkUserId, {
    id: clerkUserId,
    firstName: name,
    lastName: null,
    primaryEmailAddressId: "email_1",
    emailAddresses: [{ id: "email_1", emailAddress: email }],
  });
}

async function cleanupProvisionedUser(user: {
  id: string;
  organizationId: string | null;
}) {
  createdUserIds.push(user.id);
  if (user.organizationId) createdOrgIds.push(user.organizationId);
}

after(async () => {
  clerkClient.users.getUser = originalGetUser;
  for (const userId of createdUserIds) {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
  for (const orgId of createdOrgIds) {
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, orgId));
  }
  await pool.end();
});

test("concurrent first-login requests for the same brand-new Clerk user provision exactly one account", async () => {
  const clerkUserId = `user_race_same_${runId}`;
  registerFakeClerkUser(
    clerkUserId,
    `Race Same ${runId}`,
    `race-same-${runId}@example.com`,
  );

  const results = await Promise.all(
    Array.from({ length: 5 }, () => getOrCreateUserForClerkId(clerkUserId)),
  );

  const userIds = new Set(results.map((u) => u.id));
  assert.equal(userIds.size, 1, "all concurrent calls resolve to one user");
  await cleanupProvisionedUser(results[0]);

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  assert.equal(rows.length, 1, "exactly one user row was inserted");
});

test("concurrent first-logins for different brand-new users with the same name get distinct orgs", async () => {
  const baseName = `Race Collide ${runId}`;
  const clerkUserIds = [0, 1, 2].map((i) => `user_race_collide_${i}_${runId}`);
  for (const [i, id] of clerkUserIds.entries()) {
    registerFakeClerkUser(id, baseName, `race-collide-${i}-${runId}@example.com`);
  }

  const results = await Promise.all(
    clerkUserIds.map((id) => getOrCreateUserForClerkId(id)),
  );
  for (const user of results) await cleanupProvisionedUser(user);

  const userIds = new Set(results.map((u) => u.id));
  assert.equal(userIds.size, 3, "each user got its own row");

  const orgIds = new Set(results.map((u) => u.organizationId));
  assert.equal(orgIds.size, 3, "each user got its own organization");

  const orgs = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, results[0].organizationId!));
  assert.ok(orgs[0]?.slug, "organization has a slug");
  const allSlugs = new Set(
    await Promise.all(
      results.map(async (u) => {
        const [org] = await db
          .select()
          .from(organizationsTable)
          .where(eq(organizationsTable.id, u.organizationId!));
        return org.slug;
      }),
    ),
  );
  assert.equal(allSlugs.size, 3, "org slugs did not collide");
});
