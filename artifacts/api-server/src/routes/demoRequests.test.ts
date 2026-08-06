import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";

/**
 * Endpoint-level tests for POST /public/demo-requests: valid submission,
 * honeypot discard, invalid body, and per-IP rate limiting (429).
 *
 * Uses the real router and service against the dev database (DATABASE_URL
 * must be set). Test rows use a unique marker email domain and are cleaned
 * up afterwards.
 */

const MARKER = `rl-test-${Date.now()}`;

let server: Server;
let base: string;

before(async () => {
  const { default: router } = await import("./demoRequests.ts");
  const app = express();
  // Mirror production: proxy-resolved client IPs (see app.ts).
  app.set("trust proxy", true);
  app.use(express.json());
  // Stub req.log used by the honeypot branch (pino-http adds it in app.ts).
  app.use((req, _res, next) => {
    (req as unknown as { log: { warn: () => void } }).log = {
      warn: () => {},
    };
    next();
  });
  app.use("/", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (typeof addr === "object" && addr) base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  server?.close();
  const { db, demoRequestsTable } = await import("@workspace/db");
  const { like } = await import("drizzle-orm");
  await db
    .delete(demoRequestsTable)
    .where(like(demoRequestsTable.email, `%@${MARKER}.example.com`));
});

function post(body: unknown, xff?: string) {
  return fetch(`${base}/public/demo-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Simulates the proxy-set client chain; with trust proxy enabled
      // req.ip resolves to the leftmost entry.
      "X-Forwarded-For": xff ?? "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

test("valid submission is persisted and returns 201 with an id", async () => {
  const email = `lead@${MARKER}.example.com`;
  const res = await post({ name: "Lead", email }, "203.0.113.11");
  assert.equal(res.status, 201);
  const json = (await res.json()) as { id: string };
  assert.ok(json.id && json.id !== "ok");

  const { db, demoRequestsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(demoRequestsTable)
    .where(eq(demoRequestsTable.email, email));
  assert.equal(rows.length, 1);
});

test("filled honeypot returns benign 201 but does not persist", async () => {
  const email = `bot@${MARKER}.example.com`;
  const res = await post(
    { name: "Bot", email, website: "http://spam.example" },
    "203.0.113.12",
  );
  assert.equal(res.status, 201);

  const { db, demoRequestsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(demoRequestsTable)
    .where(eq(demoRequestsTable.email, email));
  assert.equal(rows.length, 0);
});

test("invalid body returns 400 INVALID_BODY", async () => {
  const res = await post({ name: "", email: "not-an-email" }, "203.0.113.13");
  assert.equal(res.status, 400);
  const json = (await res.json()) as { code: string };
  assert.equal(json.code, "INVALID_BODY");
});

test("6th request from the same IP within the window returns 429", async () => {
  const ip = "203.0.113.14";
  // The valid/honeypot/invalid tests used other IPs; this IP is fresh.
  for (let i = 0; i < 5; i++) {
    const res = await post({ name: "", email: "bad" }, ip); // 400s still count
    assert.equal(res.status, 400);
  }
  const blocked = await post(
    { name: "RL", email: `rl@${MARKER}.example.com` },
    ip,
  );
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as { code: string };
  assert.equal(json.code, "RATE_LIMITED");
});
