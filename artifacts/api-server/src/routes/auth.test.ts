import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";

const runId = randomUUID().slice(0, 8);
const clerkUserId = `auth-route-test-${runId}`;
let userId: string;
let server: Server;
let base = "";

before(async () => {
  const [user] = await db
    .insert(usersTable)
    .values({
      clerkUserId,
      name: "Account Export Test",
      email: `account-export-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    })
    .returning();
  userId = user.id;

  const { default: authRouter } = await import("./auth.ts");
  const app = express();
  app.set("trust proxy", true);
  app.use((req, _res, next) => {
    const testUser = req.headers["x-test-clerk-user"];
    const authFn = () => ({
      userId: typeof testUser === "string" && testUser ? testUser : null,
      tokenType: "session_token",
    });
    (req as unknown as Record<string | symbol, unknown>).auth = Object.assign(
      authFn,
      { [Symbol.for("@clerk/express.auth")]: true },
    );
    (req as unknown as { log: { info: () => void; warn: () => void } }).log = {
      info: () => {},
      warn: () => {},
    };
    next();
  });
  app.use(express.json());
  app.use("/", authRouter);
  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).json({ success: false, code: "INTERNAL_ERROR", err });
    },
  );

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  const address = server.address();
  if (typeof address === "object" && address) {
    base = `http://127.0.0.1:${address.port}`;
  }
});

after(async () => {
  server?.close();
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  await pool.end();
});

function request(
  path: string,
  options: { user?: string; body?: unknown; ip?: string } = {},
) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.user ? { "x-test-clerk-user": options.user } : {}),
      ...(options.ip ? { "x-forwarded-for": options.ip } : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
}

test("account export requires authentication", async () => {
  const response = await request("/auth/data-export", { ip: "198.51.100.10" });
  assert.equal(response.status, 401);
  const data = (await response.json()) as { code: string };
  assert.equal(data.code, "UNAUTHENTICATED");
});

test("account export contains only account-scoped data", async () => {
  const response = await request("/auth/data-export", {
    user: clerkUserId,
    ip: "198.51.100.11",
  });
  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    scope: string;
    account: { id: string; email: string; organizationId?: string };
    excludedData: string[];
  };

  assert.equal(data.scope, "ACCOUNT");
  assert.equal(data.account.id, userId);
  assert.equal(data.account.email, `account-export-${runId}@example.com`);
  assert.ok(Array.isArray(data.excludedData));
  assert.ok(data.excludedData.includes("businesses"));
  assert.equal("organizationId" in data.account, false);
  assert.equal("clerkUserId" in data.account, false);
});

test("deactivation requires the exact explicit confirmation", async () => {
  const response = await request("/auth/deactivation-request", {
    user: clerkUserId,
    ip: "198.51.100.12",
    body: { confirmation: "delete everything" },
  });
  assert.equal(response.status, 400);
  const data = (await response.json()) as { code: string };
  assert.equal(data.code, "EXPLICIT_CONFIRMATION_REQUIRED");
});

test("deactivation request is pending and does not change account data", async () => {
  const response = await request("/auth/deactivation-request", {
    user: clerkUserId,
    ip: "198.51.100.13",
    body: { confirmation: "DEACTIVATE" },
  });
  assert.equal(response.status, 202);
  const data = (await response.json()) as {
    status: string;
    message: string;
  };

  assert.equal(data.status, "PENDING_REVIEW");
  assert.match(data.message, /no business or workspace data has been changed/i);

  const [user] = await db
    .select({ status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  assert.equal(user.status, "ACTIVE");
});

test("account export is rate limited per client IP", async () => {
  const ip = "198.51.100.14";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request("/auth/data-export", {
      user: clerkUserId,
      ip,
    });
    assert.equal(response.status, 200);
  }
  const blocked = await request("/auth/data-export", {
    user: clerkUserId,
    ip,
  });
  assert.equal(blocked.status, 429);
  const data = (await blocked.json()) as { code: string };
  assert.equal(data.code, "RATE_LIMITED");
});