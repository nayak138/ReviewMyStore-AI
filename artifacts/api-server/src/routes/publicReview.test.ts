import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "node:http";

/**
 * Endpoint-level tests for the public review routes:
 *   GET  /public/review/:businessSlug/:campaignSlug          (30 req/min per IP)
 *   POST /public/review/:businessSlug/:campaignSlug/generate (10 req/min per IP)
 *   POST /public/review/:businessSlug/:campaignSlug/track-redirect (20 req/min per IP)
 *
 * All three routes are unauthenticated; a bot could inflate tap/redirect
 * analytics or abuse the AI generation call at no cost.  Tests verify that
 * a 429 with a Retry-After header is returned once the per-IP budget for
 * each route is exceeded.
 *
 * The underlying services may throw (DB unavailable, AI error, etc.) — that
 * is irrelevant here.  The rate limiter runs before the handler, and any
 * non-429 response still counts as a hit.
 */

let server: Server;
let base: string;

before(async () => {
  const { default: router } = await import("./publicReview.ts");
  const app = express();
  // Mirror production: proxy-resolved client IPs (see app.ts).
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/", router);
  // Absorb any errors the route handler rethrows so the test process doesn't
  // crash when the DB or AI service is unavailable.
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

after(() => {
  server?.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReviewPage(xff: string) {
  return fetch(`${base}/public/review/some-biz/some-campaign`, {
    headers: { "X-Forwarded-For": xff },
  });
}

function postGenerate(xff: string) {
  return fetch(`${base}/public/review/some-biz/some-campaign/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": xff,
    },
    body: JSON.stringify({ sessionId: "test-session", keywords: [] }),
  });
}

function postTrackRedirect(xff: string) {
  return fetch(`${base}/public/review/some-biz/some-campaign/track-redirect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": xff,
    },
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// Rate-limit tests — review page (30 req/min)
// ---------------------------------------------------------------------------

test("31st GET /public/review/:biz/:campaign from the same IP returns 429", async () => {
  const ip = "10.3.0.1";
  for (let i = 0; i < 30; i++) {
    const res = await getReviewPage(ip);
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await getReviewPage(ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

// ---------------------------------------------------------------------------
// Rate-limit tests — AI generate (10 req/min)
// ---------------------------------------------------------------------------

test("11th POST /public/review/:biz/:campaign/generate from the same IP returns 429", async () => {
  const ip = "10.3.0.2";
  for (let i = 0; i < 10; i++) {
    const res = await postGenerate(ip);
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await postGenerate(ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

// ---------------------------------------------------------------------------
// Rate-limit tests — tap / track-redirect (20 req/min)
// ---------------------------------------------------------------------------

test("21st POST /public/review/:biz/:campaign/track-redirect from the same IP returns 429", async () => {
  const ip = "10.3.0.3";
  for (let i = 0; i < 20; i++) {
    const res = await postTrackRedirect(ip);
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await postTrackRedirect(ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

// ---------------------------------------------------------------------------
// Cross-IP isolation
// ---------------------------------------------------------------------------

test("different IPs have independent rate-limit buckets across review routes", async () => {
  const exhaustedIp = "10.3.0.4";
  const freshIp = "10.3.0.5";

  // Exhaust the review-page bucket for one IP.
  for (let i = 0; i < 31; i++) {
    await getReviewPage(exhaustedIp);
  }
  const blocked = await getReviewPage(exhaustedIp);
  assert.equal(blocked.status, 429);

  // A different IP must not be affected.
  const res = await getReviewPage(freshIp);
  assert.notEqual(
    res.status,
    429,
    "A fresh IP should not be blocked by another IP's exhausted bucket",
  );
});

test("generate and track-redirect use separate rate-limit buckets per IP", async () => {
  // Exhaust the generate bucket (10 req) for one IP.
  const ip = "10.3.0.6";
  for (let i = 0; i < 11; i++) {
    await postGenerate(ip);
  }
  const blocked = await postGenerate(ip);
  assert.equal(blocked.status, 429);

  // The track-redirect bucket for the same IP is independent and should
  // still have capacity (it allows 20 req/min and we haven't touched it).
  const tapRes = await postTrackRedirect(ip);
  assert.notEqual(
    tapRes.status,
    429,
    "track-redirect should not be blocked just because generate is exhausted",
  );
});

// ---------------------------------------------------------------------------
// Window-expiry recovery tests
// ---------------------------------------------------------------------------

test("rate-limited tap IP is unblocked after the window expires", async () => {
  // Use a dedicated IP so this test's hits don't bleed into other tests.
  const ip = "10.3.0.9";
  const realDateNow = Date.now;

  try {
    // Exhaust the 20-request tap budget.
    for (let i = 0; i < 20; i++) {
      await postTrackRedirect(ip);
    }
    const blocked = await postTrackRedirect(ip);
    assert.equal(
      blocked.status,
      429,
      "21st request should be rate-limited (pre-condition)",
    );

    // Fast-forward Date.now by 61 s so the rate-limiter sees the window as
    // expired on the next request.  The rate limiter calls Date.now() on
    // every invocation, so patching the global is sufficient.
    const frozenNow = realDateNow();
    Date.now = () => frozenNow + 61_000;

    // The previously-blocked IP should now be allowed through again.
    const recovered = await postTrackRedirect(ip);
    assert.notEqual(
      recovered.status,
      429,
      "Previously-blocked tap IP should be unblocked after the rate-limit window expires",
    );
  } finally {
    // Always restore the real Date.now even if an assertion throws.
    Date.now = realDateNow;
  }
});

test("rate-limited generate IP is unblocked after the window expires", async () => {
  // Use a dedicated IP so this test's hits don't bleed into other tests.
  const ip = "10.3.0.10";
  const realDateNow = Date.now;

  try {
    // Exhaust the 10-request generate budget.
    for (let i = 0; i < 10; i++) {
      await postGenerate(ip);
    }
    const blocked = await postGenerate(ip);
    assert.equal(
      blocked.status,
      429,
      "11th request should be rate-limited (pre-condition)",
    );

    // Fast-forward Date.now by 61 s so the rate-limiter sees the window as
    // expired on the next request.  The rate limiter calls Date.now() on
    // every invocation, so patching the global is sufficient.
    const frozenNow = realDateNow();
    Date.now = () => frozenNow + 61_000;

    // The previously-blocked IP should now be allowed through again.
    const recovered = await postGenerate(ip);
    assert.notEqual(
      recovered.status,
      429,
      "Previously-blocked generate IP should be unblocked after the rate-limit window expires",
    );
  } finally {
    // Always restore the real Date.now even if an assertion throws.
    Date.now = realDateNow;
  }
});
