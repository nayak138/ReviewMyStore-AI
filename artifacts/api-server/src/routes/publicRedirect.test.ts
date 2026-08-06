import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "node:http";

/**
 * Endpoint-level tests for the public QR scan route:
 *   POST /public/redirect/:code/resolve
 *
 * The route is unauthenticated and logs every hit as a scan event.  A bot
 * could inflate scan analytics at no cost, so the route is rate-limited per
 * IP (max 20 req / 60 s).  Tests verify that a 429 with a Retry-After
 * header is returned once the per-IP budget is exceeded.
 *
 * The underlying redirect/scan service may throw (code not found, DB
 * unavailable, etc.), but that is irrelevant here — the rate limiter runs
 * before the handler, and any response it allows through still counts as a
 * hit against the per-IP bucket.
 */

let server: Server;
let base: string;

before(async () => {
  const { default: router } = await import("./publicRedirect.ts");
  const app = express();
  // Mirror production: proxy-resolved client IPs (see app.ts).
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/", router);
  // Absorb any errors the route handler rethrows so the test process doesn't
  // crash when the DB or redirect service is unavailable.
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
// Helper
// ---------------------------------------------------------------------------

function postResolve(code: string, xff: string) {
  return fetch(`${base}/public/redirect/${encodeURIComponent(code)}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Simulates the proxy-set client chain; with trust proxy enabled
      // req.ip resolves to the leftmost entry.
      "X-Forwarded-For": xff,
    },
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// Rate-limit tests
//
// Each test uses a distinct IP to prevent cross-test hit contamination.
// The first 20 requests may return any non-429 status (200, 404, 500)
// depending on whether the DB is reachable; the important assertion is
// that the 21st request returns 429 with a Retry-After header.
// ---------------------------------------------------------------------------

test("21st POST /public/redirect/:code/resolve from the same IP returns 429", async () => {
  const ip = "10.2.0.1";
  for (let i = 0; i < 20; i++) {
    const res = await postResolve("abc123", ip);
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await postResolve("abc123", ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  // Retry-After header must be present so clients know when to retry.
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

test("different IPs have independent scan rate-limit buckets", async () => {
  const exhaustedIp = "10.2.0.2";
  const freshIp = "10.2.0.3";

  // Exhaust one IP.
  for (let i = 0; i < 21; i++) {
    await postResolve("abc123", exhaustedIp);
  }
  const blocked = await postResolve("abc123", exhaustedIp);
  assert.equal(blocked.status, 429);

  // A different IP should not be rate-limited.
  const res = await postResolve("abc123", freshIp);
  assert.notEqual(
    res.status,
    429,
    "A fresh IP should not be blocked by another IP's exhausted bucket",
  );
});

test("rate-limited scan IP is unblocked after the window expires", async () => {
  // Use a dedicated IP so this test's hits don't bleed into other tests.
  const ip = "10.2.0.9";
  const realDateNow = Date.now;

  try {
    // Exhaust the 20-request budget.
    for (let i = 0; i < 20; i++) {
      await postResolve("abc123", ip);
    }
    const blocked = await postResolve("abc123", ip);
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
    const recovered = await postResolve("abc123", ip);
    assert.notEqual(
      recovered.status,
      429,
      "Previously-blocked scan IP should be unblocked after the rate-limit window expires",
    );
  } finally {
    // Always restore the real Date.now even if an assertion throws.
    Date.now = realDateNow;
  }
});
