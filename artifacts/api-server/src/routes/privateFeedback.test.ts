import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  businessesTable,
  campaignsTable,
  organizationsTable,
  privateFeedbackTable,
  usersTable,
} from "@workspace/db";
import { assessFeedbackQuality } from "../services/privateFeedbackService";

/**
 * Coverage for the private-feedback flow:
 *   POST  /public/review/:businessSlug/:campaignSlug/feedback (unauthenticated, 5 req/min per IP)
 *   GET   /feedback            (authenticated, org-scoped list)
 *   PATCH /feedback/:id        (authenticated, org-scoped update)
 *
 * This is the one place an anonymous customer can write free-form text into
 * the product, so the tests focus on the failure paths that would otherwise
 * fail silently or open an abuse vector: a rating that should never reach
 * the private-feedback flow, submitting against a slug that doesn't exist,
 * the per-IP rate limit actually engaging, and one organization ever seeing
 * or mutating another organization's submissions.
 *
 * Clerk is faked the same way reviewManagement.test.ts does it: a branded
 * `req.auth` handler driven by an `x-test-clerk-user` header, with
 * users/organizations pre-seeded so no Clerk API call happens.
 */

let server: Server;
let base: string;

const runId = randomUUID().slice(0, 8);
const clerkOwnerA = `user_pf_route_a_${runId}`;
const clerkOwnerB = `user_pf_route_b_${runId}`;
const clerkNoOrg = `user_pf_route_noorg_${runId}`;

let orgAId: string;
let orgBId: string;
let businessASlug: string;
let campaignASlug: string;
let businessBSlug: string;
let campaignBSlug: string;
let feedbackAId: string;
let feedbackBId: string;

const createdOrgIds: string[] = [];
let noOrgUserId: string;

test("private-feedback quality checks flag promotional content without blocking submission", () => {
  assert.deepEqual(
    assessFeedbackQuality(
      "The service was poor, but visit https://example.com for a better deal",
      null,
    ),
    { isSpam: true, reason: "Contains a promotional link" },
  );
  assert.deepEqual(
    assessFeedbackQuality("The wait was long and the staff were dismissive.", null),
    { isSpam: false, reason: null },
  );
});

test("private-feedback quality checks flag suspicious contact links", () => {
  assert.deepEqual(
    assessFeedbackQuality("The order was incorrect.", "https://spam.example"),
    { isSpam: true, reason: "Contact field contains a link" },
  );
});

before(async () => {
  businessASlug = `pf-route-biz-a-${runId}`;
  campaignASlug = `pf-route-campaign-a-${runId}`;
  businessBSlug = `pf-route-biz-b-${runId}`;
  campaignBSlug = `pf-route-campaign-b-${runId}`;

  const [orgA] = await db
    .insert(organizationsTable)
    .values({ name: `PF Route A ${runId}`, slug: `pf-route-a-${runId}` })
    .returning();
  const [orgB] = await db
    .insert(organizationsTable)
    .values({ name: `PF Route B ${runId}`, slug: `pf-route-b-${runId}` })
    .returning();
  orgAId = orgA.id;
  orgBId = orgB.id;
  createdOrgIds.push(orgA.id, orgB.id);

  const [businessA] = await db
    .insert(businessesTable)
    .values({
      organizationId: orgAId,
      name: "PF Route Store A",
      category: "Retail",
      slug: businessASlug,
      status: "ACTIVE",
    })
    .returning();
  const [businessB] = await db
    .insert(businessesTable)
    .values({
      organizationId: orgBId,
      name: "PF Route Store B",
      category: "Retail",
      slug: businessBSlug,
      status: "ACTIVE",
    })
    .returning();

  const [campaignA] = await db
    .insert(campaignsTable)
    .values({
      businessId: businessA.id,
      name: "PF Route Campaign A",
      slug: campaignASlug,
      status: "ACTIVE",
    })
    .returning();
  const [campaignB] = await db
    .insert(campaignsTable)
    .values({
      businessId: businessB.id,
      name: "PF Route Campaign B",
      slug: campaignBSlug,
      status: "ACTIVE",
    })
    .returning();

  await db.insert(usersTable).values([
    {
      organizationId: orgAId,
      clerkUserId: clerkOwnerA,
      name: "PF Route Owner A",
      email: `pf-route-a-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    },
    {
      organizationId: orgBId,
      clerkUserId: clerkOwnerB,
      name: "PF Route Owner B",
      email: `pf-route-b-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    },
  ]);
  const [noOrgUser] = await db
    .insert(usersTable)
    .values({
      organizationId: null,
      clerkUserId: clerkNoOrg,
      name: "PF Route No Org",
      email: `pf-route-noorg-${runId}@example.com`,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    })
    .returning();
  noOrgUserId = noOrgUser.id;

  // Pre-seed one feedback row per organization directly, so the list/update
  // tenant-isolation tests have known targets independent of the
  // submission-endpoint tests below.
  const [feedbackA] = await db
    .insert(privateFeedbackTable)
    .values({
      organizationId: orgAId,
      businessId: businessA.id,
      campaignId: campaignA.id,
      sessionId: `seed-session-a-${runId}`,
      rating: 1,
      message: "Seed feedback for org A",
      status: "NEW",
    })
    .returning();
  const [feedbackB] = await db
    .insert(privateFeedbackTable)
    .values({
      organizationId: orgBId,
      businessId: businessB.id,
      campaignId: campaignB.id,
      sessionId: `seed-session-b-${runId}`,
      rating: 2,
      message: "Seed feedback for org B",
      status: "NEW",
    })
    .returning();
  feedbackAId = feedbackA.id;
  feedbackBId = feedbackB.id;

  const { default: publicReviewRouter } = await import("./publicReview.ts");
  const { default: feedbackRouter } = await import("./feedback.ts");
  const app = express();
  // Mirror production: proxy-resolved client IPs (see app.ts).
  app.set("trust proxy", true);
  // Install the same branded auth handler `clerkMiddleware` would, resolved
  // from a test header.
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
  app.use("/", publicReviewRouter);
  app.use("/", feedbackRouter);
  // Absorb any errors the route handler rethrows so the test process doesn't
  // crash when the DB is unavailable.
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
  server?.close();
  for (const orgId of createdOrgIds) {
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  }
  await db.delete(usersTable).where(eq(usersTable.id, noOrgUserId));
  await pool.end();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function postFeedback(
  businessSlug: string,
  campaignSlug: string,
  xff: string,
  overrides: Record<string, unknown> = {},
) {
  return fetch(
    `${base}/public/review/${businessSlug}/${campaignSlug}/feedback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": xff,
      },
      body: JSON.stringify({
        sessionId: `sess-${randomUUID()}`,
        rating: 1,
        message: "The service was slow and my order was wrong.",
        ...overrides,
      }),
    },
  );
}

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
// Rating validation (defense-in-depth: InvalidFeedbackRatingError)
// ---------------------------------------------------------------------------

test("a rating of 3 or higher is rejected with 400 INVALID_RATING and nothing is persisted", async () => {
  for (const rating of [3, 4, 5]) {
    const sessionId = `sess-invalid-rating-${rating}-${runId}`;
    const res = await postFeedback(businessASlug, campaignASlug, "10.9.0.1", {
      rating,
      sessionId,
    });
    assert.equal(res.status, 400, `rating ${rating} should be rejected`);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, "INVALID_RATING");

    const rows = await db
      .select()
      .from(privateFeedbackTable)
      .where(eq(privateFeedbackTable.sessionId, sessionId));
    assert.equal(rows.length, 0, `rating ${rating} must not be persisted`);
  }
});

test("a rating below 3 is accepted", async () => {
  const sessionId = `sess-valid-rating-${runId}`;
  const res = await postFeedback(businessASlug, campaignASlug, "10.9.0.1", {
    rating: 2,
    sessionId,
  });
  assert.equal(res.status, 201);
  const json = (await res.json()) as { success: boolean };
  assert.equal(json.success, true);

  const rows = await db
    .select()
    .from(privateFeedbackTable)
    .where(eq(privateFeedbackTable.sessionId, sessionId));
  assert.equal(rows.length, 1);
});

// ---------------------------------------------------------------------------
// Non-existent business/campaign slug
// ---------------------------------------------------------------------------

test("submitting to a non-existent business/campaign slug returns 404", async () => {
  const res = await postFeedback(
    `no-such-business-${runId}`,
    `no-such-campaign-${runId}`,
    "10.9.0.2",
  );
  assert.equal(res.status, 404);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "NOT_FOUND");
});

test("submitting to a real business but a non-existent campaign slug returns 404", async () => {
  const res = await postFeedback(
    businessASlug,
    `no-such-campaign-${runId}`,
    "10.9.0.2",
  );
  assert.equal(res.status, 404);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "NOT_FOUND");
});

// ---------------------------------------------------------------------------
// Per-IP rate limit (5 req/min)
// ---------------------------------------------------------------------------

test("6th feedback submission from the same IP within the window returns 429", async () => {
  const ip = "10.9.0.3";
  for (let i = 0; i < 5; i++) {
    const res = await postFeedback(businessASlug, campaignASlug, ip);
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await postFeedback(businessASlug, campaignASlug, ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

test("a different IP is not affected by another IP's exhausted feedback bucket", async () => {
  const exhaustedIp = "10.9.0.4";
  const freshIp = "10.9.0.5";
  for (let i = 0; i < 6; i++) {
    await postFeedback(businessASlug, campaignASlug, exhaustedIp);
  }
  const blocked = await postFeedback(businessASlug, campaignASlug, exhaustedIp);
  assert.equal(blocked.status, 429);

  const res = await postFeedback(businessASlug, campaignASlug, freshIp);
  assert.notEqual(
    res.status,
    429,
    "A fresh IP should not be blocked by another IP's exhausted bucket",
  );
});

// ---------------------------------------------------------------------------
// Authenticated list/update: organization isolation
// ---------------------------------------------------------------------------

test("unauthenticated requests to list feedback are rejected with 401", async () => {
  const res = await request("GET", "/feedback");
  assert.equal(res.status, 401);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "UNAUTHENTICATED");
});

test("a user without an organization gets 403 NO_ORGANIZATION", async () => {
  const res = await request("GET", "/feedback", { user: clerkNoOrg });
  assert.equal(res.status, 403);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "NO_ORGANIZATION");
});

test("an owner only sees their own organization's feedback", async () => {
  const resA = await request("GET", "/feedback", { user: clerkOwnerA });
  assert.equal(resA.status, 200);
  const jsonA = (await resA.json()) as { feedback: Array<{ id: string }> };
  const idsA = jsonA.feedback.map((f) => f.id);
  assert.ok(idsA.includes(feedbackAId), "owner A should see their own feedback");
  assert.ok(
    !idsA.includes(feedbackBId),
    "owner A must not see org B's feedback",
  );

  const resB = await request("GET", "/feedback", { user: clerkOwnerB });
  assert.equal(resB.status, 200);
  const jsonB = (await resB.json()) as { feedback: Array<{ id: string }> };
  const idsB = jsonB.feedback.map((f) => f.id);
  assert.ok(idsB.includes(feedbackBId), "owner B should see their own feedback");
  assert.ok(
    !idsB.includes(feedbackAId),
    "owner B must not see org A's feedback",
  );
});

test("an owner cannot update another organization's feedback", async () => {
  const res = await request("PATCH", `/feedback/${feedbackBId}`, {
    user: clerkOwnerA,
    body: { status: "VIEWED" },
  });
  assert.equal(res.status, 404);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "NOT_FOUND");

  const [row] = await db
    .select()
    .from(privateFeedbackTable)
    .where(eq(privateFeedbackTable.id, feedbackBId));
  assert.equal(
    row.status,
    "NEW",
    "a cross-tenant update attempt must not modify the row",
  );
});

test("an owner can update their own organization's feedback", async () => {
  const res = await request("PATCH", `/feedback/${feedbackAId}`, {
    user: clerkOwnerA,
    body: { status: "RESOLVED" },
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as { id: string; status: string };
  assert.equal(json.id, feedbackAId);
  assert.equal(json.status, "RESOLVED");

  const [row] = await db
    .select()
    .from(privateFeedbackTable)
    .where(eq(privateFeedbackTable.id, feedbackAId));
  assert.equal(row.status, "RESOLVED");
});
