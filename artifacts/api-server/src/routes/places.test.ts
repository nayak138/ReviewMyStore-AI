import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "node:http";

/**
 * Endpoint-level tests for the public places routes:
 *   GET /places/autocomplete
 *   GET /places/details/:placeId
 *   GET /places/photo
 *
 * All three routes share a single per-IP rate limiter (max 40 req / 60 s).
 * Tests verify that a 429 is returned once the per-IP limit is exceeded,
 * catching any regression that silently removes the rate limiter.
 *
 * The underlying Google Business Service may or may not succeed (depending
 * on whether a real API key is present), but that does not matter here —
 * the rate limiter runs first, and any response it allows through (200,
 * 400, 502 …) still counts as a hit against the per-IP bucket.
 */

let server: Server;
let base: string;

before(async () => {
  const { default: router } = await import("./places.ts");
  const app = express();
  // Mirror production: proxy-resolved client IPs (see app.ts).
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/", router);
  // Catch any async errors that the route handler rethrows so the test
  // process does not crash when the Google API is unavailable.
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

function getAutocomplete(input: string, xff: string) {
  return fetch(
    `${base}/places/autocomplete?input=${encodeURIComponent(input)}`,
    {
      headers: {
        // Simulates the proxy-set client chain; with trust proxy enabled
        // req.ip resolves to the leftmost entry.
        "X-Forwarded-For": xff,
      },
    },
  );
}

function getDetails(placeId: string, xff: string) {
  return fetch(`${base}/places/details/${encodeURIComponent(placeId)}`, {
    headers: { "X-Forwarded-For": xff },
  });
}

function getPhoto(name: string, xff: string) {
  return fetch(`${base}/places/photo?name=${encodeURIComponent(name)}`, {
    headers: { "X-Forwarded-For": xff },
  });
}

// ---------------------------------------------------------------------------
// Basic smoke tests
// ---------------------------------------------------------------------------

test("GET /places/autocomplete returns 400 when input is missing", async () => {
  const res = await fetch(`${base}/places/autocomplete`, {
    headers: { "X-Forwarded-For": "10.0.0.1" },
  });
  assert.equal(res.status, 400);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "INVALID_QUERY");
});

// ---------------------------------------------------------------------------
// Rate-limit tests
//
// Each test uses a distinct IP to prevent cross-test hit contamination.
// The first 40 requests may return any non-429 status (200, 400, 502, 500)
// depending on whether the Google Places API is reachable; the important
// assertion is that the 41st request returns 429.
// ---------------------------------------------------------------------------

test("41st /places/autocomplete request from the same IP returns 429", async () => {
  const ip = "10.1.0.1";
  // Exhaust the 40-request budget. Responses may be 200/502/500 — only
  // the rate limiter's decision matters, not the backend's.
  for (let i = 0; i < 40; i++) {
    const res = await getAutocomplete("test query", ip);
    // Confirm none of the first 40 are 429 (the limit hasn't been hit yet).
    assert.notEqual(
      res.status,
      429,
      `Request ${i + 1} should not be rate-limited yet`,
    );
  }
  const blocked = await getAutocomplete("test query", ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  // Retry-After header must be present so clients know when to retry.
  assert.ok(
    blocked.headers.get("retry-after"),
    "Retry-After header should be set on 429",
  );
});

test("41st /places/details/:placeId request from the same IP returns 429", async () => {
  const ip = "10.1.0.2";
  for (let i = 0; i < 40; i++) {
    const res = await getDetails("ChIJmock123", ip);
    assert.notEqual(res.status, 429, `Request ${i + 1} should not be rate-limited yet`);
  }
  const blocked = await getDetails("ChIJmock123", ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(blocked.headers.get("retry-after"));
});

test("41st /places/photo request from the same IP returns 429", async () => {
  const ip = "10.1.0.3";
  for (let i = 0; i < 40; i++) {
    const res = await getPhoto("places/mock/photos/abc", ip);
    assert.notEqual(res.status, 429, `Request ${i + 1} should not be rate-limited yet`);
  }
  const blocked = await getPhoto("places/mock/photos/abc", ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
  assert.ok(blocked.headers.get("retry-after"));
});

test("cross-route hits from the same IP share the same bucket", async () => {
  // The rate limiter is a single middleware instance shared across all three
  // routes. Hits on /autocomplete count toward the same IP bucket as hits on
  // /details and /photo.
  const ip = "10.1.0.4";
  // 20 autocomplete + 20 details = 40 total; the next /photo request is blocked.
  for (let i = 0; i < 20; i++) {
    await getAutocomplete("query", ip);
  }
  for (let i = 0; i < 20; i++) {
    await getDetails("ChIJmock123", ip);
  }
  const blocked = await getPhoto("places/mock/photos/abc", ip);
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
});

test("different IPs have independent rate-limit buckets", async () => {
  const exhaustedIp = "10.1.0.5";
  const freshIp = "10.1.0.6";

  // Exhaust one IP.
  for (let i = 0; i < 41; i++) {
    await getAutocomplete("query", exhaustedIp);
  }
  const blocked = await getAutocomplete("query", exhaustedIp);
  assert.equal(blocked.status, 429);

  // A different IP should not be rate-limited (it has zero hits).
  const res = await getAutocomplete("query", freshIp);
  assert.notEqual(
    res.status,
    429,
    "A fresh IP should not be blocked by another IP's exhausted bucket",
  );
});

test("rate-limited IP is unblocked after the window expires", async () => {
  // Use a dedicated IP so this test's hits don't bleed into other tests.
  const ip = "10.1.0.7";
  const realDateNow = Date.now;

  try {
    // Exhaust the 40-request budget.
    for (let i = 0; i < 40; i++) {
      await getAutocomplete("test query", ip);
    }
    const blocked = await getAutocomplete("test query", ip);
    assert.equal(
      blocked.status,
      429,
      "41st request should be rate-limited (pre-condition)",
    );

    // Fast-forward Date.now by 61 s so the rate-limiter sees the window as
    // expired on the next request. The rate limiter calls Date.now() on
    // every invocation, so patching the global is sufficient.
    const frozenNow = realDateNow();
    Date.now = () => frozenNow + 61_000;

    // The previously-blocked IP should now be allowed through again.
    const recovered = await getAutocomplete("test query", ip);
    assert.notEqual(
      recovered.status,
      429,
      "Previously-blocked IP should be unblocked after the rate-limit window expires",
    );
  } finally {
    // Always restore the real Date.now even if an assertion throws.
    Date.now = realDateNow;
  }
});
