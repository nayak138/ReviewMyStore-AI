import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { rateLimit } from "./rateLimit.ts";

/**
 * The limiter keys on req.ip, which Express resolves from the trusted
 * proxy chain (`trust proxy` in app.ts). Replit's ingress proxy overwrites
 * any client-supplied X-Forwarded-For header, so from the app's point of
 * view req.ip is always the real client address. These tests simulate that
 * by setting req.ip directly: an attacker spoofing XFF still arrives with
 * the same resolved ip, so the limit holds.
 */

function makeReq(ip: string, headers: Record<string, string> = {}): Request {
  return {
    ip,
    headers,
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
}

function makeRes() {
  const out = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string | number>,
  };
  const res = {
    setHeader(name: string, value: string | number) {
      out.headers[name] = value;
      return res;
    },
    status(code: number) {
      out.statusCode = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    },
  } as unknown as Response;
  return { res, out };
}

function run(
  middleware: ReturnType<typeof rateLimit>,
  req: Request,
): { nextCalled: boolean; out: ReturnType<typeof makeRes>["out"] } {
  const { res, out } = makeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, out };
}

test("allows up to `max` requests, then returns 429 with Retry-After", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 5 });
  for (let i = 0; i < 5; i++) {
    const { nextCalled } = run(limiter, makeReq("203.0.113.7"));
    assert.equal(nextCalled, true, `request ${i + 1} should pass`);
  }
  const blocked = run(limiter, makeReq("203.0.113.7"));
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.out.statusCode, 429);
  assert.equal(
    (blocked.out.body as { code: string }).code,
    "RATE_LIMITED",
  );
  assert.ok(Number(blocked.out.headers["Retry-After"]) >= 1);
});

test("spoofed X-Forwarded-For header does not evade the limit (limiter keys on resolved req.ip, not raw headers)", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 5 });
  // Attacker varies the XFF header on every request, but the platform
  // proxy overwrites it, so the resolved req.ip stays the same.
  for (let i = 0; i < 5; i++) {
    const req = makeReq("198.51.100.1", {
      "x-forwarded-for": `10.0.0.${i}, 1.2.3.${i}`,
    });
    const { nextCalled } = run(limiter, req);
    assert.equal(nextCalled, true);
  }
  const blocked = run(
    limiter,
    makeReq("198.51.100.1", { "x-forwarded-for": "9.9.9.9" }),
  );
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.out.statusCode, 429);
});

test("different client IPs have independent windows", () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2 });
  run(limiter, makeReq("203.0.113.1"));
  run(limiter, makeReq("203.0.113.1"));
  const blocked = run(limiter, makeReq("203.0.113.1"));
  assert.equal(blocked.out.statusCode, 429);

  const other = run(limiter, makeReq("203.0.113.2"));
  assert.equal(other.nextCalled, true);
});

test("window expiry resets the counter", async () => {
  const limiter = rateLimit({ windowMs: 50, max: 1 });
  assert.equal(run(limiter, makeReq("203.0.113.3")).nextCalled, true);
  assert.equal(run(limiter, makeReq("203.0.113.3")).out.statusCode, 429);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(run(limiter, makeReq("203.0.113.3")).nextCalled, true);
});
