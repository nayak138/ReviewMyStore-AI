import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import {
  db,
  organizationsTable,
  pool,
  usersTable,
} from "@workspace/db";

const runId = randomUUID().slice(0, 8);
const ownerClerkId = `user_admin_guard_owner_${runId}`;
const adminClerkId = `user_admin_guard_admin_${runId}`;
let ownerId: string;
let adminId: string;
let server: Server;
let baseUrl: string;

before(async () => {
  const [organization] = await db
    .insert(organizationsTable)
    .values({
      name: `Admin Guard Agency ${runId}`,
      slug: `admin-guard-agency-${runId}`,
    })
    .returning();
  const [owner] = await db
    .insert(usersTable)
    .values({
      organizationId: organization.id,
      clerkUserId: ownerClerkId,
      name: "Regular Agency Owner",
      email: `admin-guard-owner-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    })
    .returning();
  const [admin] = await db
    .insert(usersTable)
    .values({
      organizationId: null,
      clerkUserId: adminClerkId,
      name: "Platform Admin",
      email: `admin-guard-admin-${runId}@example.com`,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    })
    .returning();
  ownerId = owner.id;
  adminId = admin.id;

  const { default: adminRouter } = await import("./admin.ts");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const clerkUserId = req.header("x-test-clerk-user") ?? null;
    const authFn = () => ({ userId: clerkUserId, tokenType: "session_token" });
    Object.assign(authFn, {
      [Symbol.for("@clerk/express.auth")]: true,
    });
    (req as unknown as { auth: typeof authFn }).auth = authFn;
    (req as unknown as { log: { error: () => void } }).log = {
      error: () => {},
    };
    next();
  });
  app.use("/", adminRouter);
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine test server address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server?.close();
  const [owner] = await db
    .select({ organizationId: usersTable.organizationId })
    .from(usersTable)
    .where(eq(usersTable.id, ownerId));
  await db.delete(usersTable).where(eq(usersTable.id, ownerId));
  await db.delete(usersTable).where(eq(usersTable.id, adminId));
  if (owner?.organizationId) {
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, owner.organizationId));
  }
  await pool.end();
});

test("regular agency owners cannot access the admin portal API", async () => {
  const response = await fetch(`${baseUrl}/admin/portal`, {
    headers: { "x-test-clerk-user": ownerClerkId },
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    code: "FORBIDDEN",
    message: "You do not have permission to access this resource.",
  });
});

test("unauthenticated callers cannot access the admin portal API", async () => {
  const response = await fetch(`${baseUrl}/admin/portal`);
  assert.equal(response.status, 401);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("regular agency owners cannot reset platform tenant data", async () => {
  const response = await fetch(`${baseUrl}/admin/platform-data`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-test-clerk-user": ownerClerkId,
    },
    body: JSON.stringify({ confirmation: "DELETE ALL AGENCIES" }),
  });

  assert.equal(response.status, 403);
});

test("a Super Admin must provide the exact platform-reset confirmation", async () => {
  const response = await fetch(`${baseUrl}/admin/platform-data`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      "x-test-clerk-user": adminClerkId,
    },
    body: JSON.stringify({ confirmation: "delete everything" }),
  });

  assert.equal(response.status, 400);
  const [owner] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, ownerId));
  assert.equal(owner?.id, ownerId, "invalid confirmation must not delete data");
});