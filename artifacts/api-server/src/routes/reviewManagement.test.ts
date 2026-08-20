import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  managedReviewsTable,
  organizationsTable,
  providerConnectionsTable,
  reviewLocationsTable,
  usersTable,
} from "@workspace/db";

/**
 * Endpoint-level tests for the review-management routes:
 *   GET    /review-management
 *   POST   /review-management/connection
 *   POST   /review-management/sync
 *   GET    /review-management/reviews
 *   POST   /review-management/reviews/:id/draft
 *   POST   /review-management/reviews/:id/reply
 *   DELETE /review-management/reviews/:id/reply
 *
 * Clerk is faked by attaching a branded `req.auth` handler (the same shape
 * `clerkMiddleware` installs), driven by an `x-test-clerk-user` header, and
 * users/organizations are pre-seeded so no Clerk API call happens. The BNDLE
 * provider is faked by patching `globalThis.fetch` for provider URLs only.
 *
 * Covered: authentication/organization guards, invalid review identifiers,
 * invalid reply bodies, cross-organization access, safe (non-leaking)
 * provider error responses, and the idempotent republish path.
 */

const BNDLE_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://api.bundle.social";

let server: Server;
let base: string;

const runId = randomUUID().slice(0, 8);
const clerkOwnerA = `user_rm_route_a_${runId}`;
const clerkOwnerB = `user_rm_route_b_${runId}`;
const clerkNoOrg = `user_rm_route_noorg_${runId}`;

let orgAId: string; // owner A: never connected
let orgBId: string; // owner B: has connection + location + review
let reviewBId: string;
let connectionBId: string;

const createdOrgIds: string[] = [];
let noOrgUserId: string;

// Only provider-bound requests are intercepted; the test client's own
// requests to the local server go through the real fetch.
const realFetch = globalThis.fetch;
let bndleHits = 0;
let bndleResult: { status: number; body: unknown } = { status: 200, body: {} };

before(async () => {
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (urlStr.startsWith(BNDLE_BASE)) {
      bndleHits += 1;
      return new Response(JSON.stringify(bndleResult.body), {
        status: bndleResult.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return realFetch(input as never, init);
  }) as typeof fetch;

  // Seed tenants and users so requireAuth resolves without calling Clerk.
  const [orgA] = await db
    .insert(organizationsTable)
    .values({ name: `RM Route A ${runId}`, slug: `rm-route-a-${runId}` })
    .returning();
  const [orgB] = await db
    .insert(organizationsTable)
    .values({ name: `RM Route B ${runId}`, slug: `rm-route-b-${runId}` })
    .returning();
  orgAId = orgA.id;
  orgBId = orgB.id;
  createdOrgIds.push(orgA.id, orgB.id);

  await db.insert(usersTable).values([
    {
      organizationId: orgA.id,
      clerkUserId: clerkOwnerA,
      name: "Route Owner A",
      email: `rm-route-a-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    },
    {
      organizationId: orgB.id,
      clerkUserId: clerkOwnerB,
      name: "Route Owner B",
      email: `rm-route-b-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    },
  ]);
  const [noOrgUser] = await db
    .insert(usersTable)
    .values({
      organizationId: null,
      clerkUserId: clerkNoOrg,
      name: "Route No Org",
      email: `rm-route-noorg-${runId}@example.com`,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    })
    .returning();
  noOrgUserId = noOrgUser.id;

  const [connectionB] = await db
    .insert(providerConnectionsTable)
    .values({
      organizationId: orgB.id,
      provider: "BNDLE",
      externalProfileId: `prof-route-${runId}`,
      status: "CONNECTED",
    })
    .returning();
  connectionBId = connectionB.id;
  const [locationB] = await db
    .insert(reviewLocationsTable)
    .values({
      organizationId: orgB.id,
      providerConnectionId: connectionB.id,
      externalAccountId: `acc-route-${runId}`,
      externalLocationId: `loc-route-${runId}`,
      name: "Route Test Store",
    })
    .returning();
  const [reviewB] = await db
    .insert(managedReviewsTable)
    .values({
      organizationId: orgB.id,
      reviewLocationId: locationB.id,
      externalReviewId: `ext-route-${runId}`,
      reviewerName: "Route Reviewer",
      rating: 4,
      comment: "Nice store",
      responseStatus: "PENDING",
    })
    .returning();
  reviewBId = reviewB.id;

  const { default: router } = await import("./reviewManagement.ts");
  const app = express();
  // Install the same branded auth handler `clerkMiddleware` would, resolved
  // from a test header, plus a silent request logger for the route handlers.
  const clerkAuthBrand = Symbol.for("@clerk/express.auth");
  app.use((req, _res, next) => {
    const testUser = req.headers["x-test-clerk-user"];
    const authFn = () => ({
      userId: typeof testUser === "string" && testUser ? testUser : null,
      tokenType: "session_token",
    });
    (req as unknown as Record<string, unknown>).auth = Object.assign(authFn, {
      [clerkAuthBrand]: true,
    });
    (req as unknown as Record<string, unknown>).log = {
      info() {},
      warn() {},
      error() {},
    };
    next();
  });
  app.use(express.json());
  app.use("/", router);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ success: false, code: "INTERNAL_ERROR" });
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (typeof addr === "object" && addr) base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  globalThis.fetch = realFetch;
  server?.close();
  for (const orgId of createdOrgIds) {
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  }
  await db.delete(usersTable).where(eq(usersTable.id, noOrgUserId));
  await pool.end();
});

function request(
  method: string,
  path: string,
  options: { user?: string; body?: unknown } = {},
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.user ? { "x-test-clerk-user": options.user } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

// ---------------------------------------------------------------------------
// Authentication and organization guards
// ---------------------------------------------------------------------------

test("unauthenticated requests are rejected with 401", async () => {
  const res = await request("GET", "/review-management");
  assert.equal(res.status, 401);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "UNAUTHENTICATED");
});

test("users without an organization get 403 NO_ORGANIZATION", async () => {
  const res = await request("GET", "/review-management", { user: clerkNoOrg });
  assert.equal(res.status, 403);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "NO_ORGANIZATION");
});

test("dashboard reports DISCONNECTED for an organization that never connected", async () => {
  const res = await request("GET", "/review-management", { user: clerkOwnerA });
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    connection: { status: string };
    summary: { totalReviews: number };
  };
  assert.equal(json.connection.status, "DISCONNECTED");
  assert.equal(json.summary.totalReviews, 0);
});

test("sync without a connection returns 409 REVIEW_PROVIDER_NOT_CONNECTED", async () => {
  const res = await request("POST", "/review-management/sync", {
    user: clerkOwnerA,
  });
  assert.equal(res.status, 409);
  const json = (await res.json()) as { code: string; message: string };
  assert.equal(json.code, "REVIEW_PROVIDER_NOT_CONNECTED");
});

// ---------------------------------------------------------------------------
// Invalid review identifiers and reply bodies
// ---------------------------------------------------------------------------

test("non-UUID review ids are rejected with 400 on draft, reply, and delete", async () => {
  for (const [method, path, code] of [
    ["POST", "/review-management/reviews/not-a-uuid/draft", "INVALID_PARAMS"],
    ["POST", "/review-management/reviews/not-a-uuid/reply", "INVALID_REQUEST"],
    ["DELETE", "/review-management/reviews/not-a-uuid/reply", "INVALID_PARAMS"],
  ] as const) {
    const res = await request(method, path, {
      user: clerkOwnerB,
      body: method === "DELETE" ? undefined : { comment: "Hello" },
    });
    assert.equal(res.status, 400, `${method} ${path} should be rejected`);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, code);
  }
});

test("invalid reply bodies are rejected with 400 before any provider call", async () => {
  bndleHits = 0;
  for (const body of [undefined, {}, { comment: "" }, { comment: "x".repeat(4001) }]) {
    const res = await request(
      "POST",
      `/review-management/reviews/${reviewBId}/reply`,
      { user: clerkOwnerB, body },
    );
    assert.equal(res.status, 400, `body ${JSON.stringify(body)} should be rejected`);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, "INVALID_REQUEST");
  }
  assert.equal(bndleHits, 0, "invalid bodies must never reach the provider");
});

test("invalid list query params are rejected with 400 INVALID_QUERY", async () => {
  const res = await request("GET", "/review-management/reviews?rating=9", {
    user: clerkOwnerB,
  });
  assert.equal(res.status, 400);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "INVALID_QUERY");
});

// ---------------------------------------------------------------------------
// Ownership and missing reviews
// ---------------------------------------------------------------------------

test("a valid-but-unknown review id returns 404 on draft and reply", async () => {
  const ghost = randomUUID();
  const draftRes = await request(
    "POST",
    `/review-management/reviews/${ghost}/draft`,
    { user: clerkOwnerB },
  );
  assert.equal(draftRes.status, 404);
  const replyRes = await request(
    "POST",
    `/review-management/reviews/${ghost}/reply`,
    { user: clerkOwnerB, body: { comment: "Hello" } },
  );
  assert.equal(replyRes.status, 404);
  const json = (await replyRes.json()) as { code: string };
  assert.equal(json.code, "NOT_FOUND");
});

test("another organization's review id returns 404, not the review data", async () => {
  const res = await request(
    "POST",
    `/review-management/reviews/${reviewBId}/reply`,
    { user: clerkOwnerA, body: { comment: "Cross-tenant attempt" } },
  );
  assert.equal(res.status, 404);
  const json = (await res.json()) as { code: string; message: string };
  assert.equal(json.code, "NOT_FOUND");
});

// ---------------------------------------------------------------------------
// Safe provider errors
// ---------------------------------------------------------------------------

test("a provider 500 during publish returns a generic 502 and leaves the review pending", async () => {
  bndleResult = {
    status: 500,
    body: { error: "internal stack trace with SECRET_UPSTREAM_DETAIL" },
  };
  const res = await request(
    "POST",
    `/review-management/reviews/${reviewBId}/reply`,
    { user: clerkOwnerB, body: { comment: "Thanks for stopping by!" } },
  );
  assert.equal(res.status, 502);
  const json = (await res.json()) as { code: string; message: string };
  assert.equal(json.code, "REVIEW_PROVIDER_ERROR");
  assert.ok(
    !json.message.includes("SECRET_UPSTREAM_DETAIL"),
    "upstream provider internals must not leak to clients",
  );

  const [row] = await db
    .select()
    .from(managedReviewsTable)
    .where(eq(managedReviewsTable.id, reviewBId));
  assert.equal(row.responseStatus, "PENDING", "failed publish must not mark the reply published");
  assert.equal(row.replyText, null);
});

test("a provider 401 during sync maps to a safe 503 configuration error", async () => {
  // 401/403 from bundle.social means OUR platform API key is bad — the
  // response must say "not configured" and never blame the owner's Google
  // connection or leak the upstream body.
  bndleResult = { status: 401, body: { message: "invalid api key deadbeef" } };
  const res = await request("POST", "/review-management/sync", {
    user: clerkOwnerB,
  });
  assert.equal(res.status, 503);
  const json = (await res.json()) as { code: string; message: string };
  assert.equal(json.code, "REVIEW_PROVIDER_NOT_CONFIGURED");
  assert.ok(!json.message.includes("deadbeef"), "upstream body must not leak");

  const [conn] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connectionBId));
  assert.equal(
    conn.status,
    "CONNECTED",
    "a platform key problem must not flag the owner's connection as broken",
  );
});

// ---------------------------------------------------------------------------
// Idempotent republish
// ---------------------------------------------------------------------------

test("republishing an already-published identical reply succeeds without a provider call", async () => {
  await db
    .update(managedReviewsTable)
    .set({
      responseStatus: "PUBLISHED",
      replyText: "Thanks for stopping by!",
      replyUpdatedAt: new Date(),
    })
    .where(eq(managedReviewsTable.id, reviewBId));

  bndleResult = { status: 500, body: {} }; // any provider call would fail loudly
  bndleHits = 0;
  const res = await request(
    "POST",
    `/review-management/reviews/${reviewBId}/reply`,
    { user: clerkOwnerB, body: { comment: "Thanks for stopping by!" } },
  );
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    review: { responseStatus: string; replyText: string };
  };
  assert.equal(json.review.responseStatus, "PUBLISHED");
  assert.equal(json.review.replyText, "Thanks for stopping by!");
  assert.equal(bndleHits, 0, "an identical retry must not call the provider");
});
