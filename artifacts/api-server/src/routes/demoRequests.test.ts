import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { clerkClient } from "@clerk/express";

/**
 * Endpoint-level tests for POST /public/demo-requests: valid submission,
 * honeypot discard, invalid body, and per-IP rate limiting (429).
 *
 * Uses the real router and service against the dev database (DATABASE_URL
 * must be set). Test rows use a unique marker email domain and are cleaned
 * up afterwards.
 */

const MARKER = `rl-test-${Date.now()}`;
const previousSheetsSync = process.env.GOOGLE_SHEETS_LEADS_SYNC;
const previousDemoAlertEmails = process.env.DEMO_ALERT_EMAILS;

let server: Server;
let base: string;
let router: express.Router;
const rejectedRecipients = new Set<string>();

type CreateEmail = typeof clerkClient.emails.create;
type EmailPayload = Parameters<CreateEmail>[0];
let originalCreateEmail: CreateEmail;

async function startServer() {
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
}

async function stopServer() {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

before(async () => {
  process.env.GOOGLE_SHEETS_LEADS_SYNC = "false";
  process.env.DEMO_ALERT_EMAILS = "";
  originalCreateEmail = clerkClient.emails.create;
  clerkClient.emails.create = (async (payload: EmailPayload) => {
    if (rejectedRecipients.has(payload.to.address ?? "")) {
      throw new Error("Test alert delivery rejection");
    }
    return {} as Awaited<ReturnType<CreateEmail>>;
  }) as CreateEmail;
  ({ default: router } = await import("./demoRequests.ts"));
  await startServer();
});

after(async () => {
  if (previousSheetsSync === undefined) {
    delete process.env.GOOGLE_SHEETS_LEADS_SYNC;
  } else {
    process.env.GOOGLE_SHEETS_LEADS_SYNC = previousSheetsSync;
  }
  if (previousDemoAlertEmails === undefined) {
    delete process.env.DEMO_ALERT_EMAILS;
  } else {
    process.env.DEMO_ALERT_EMAILS = previousDemoAlertEmails;
  }
  clerkClient.emails.create = originalCreateEmail;
  await stopServer();
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

async function waitForDemoAlertStatus(id: string, expectedStatus: string) {
  const { db, demoRequestsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    const [row] = await db
      .select({
        alertDeliveryStatus: demoRequestsTable.alertDeliveryStatus,
      })
      .from(demoRequestsTable)
      .where(eq(demoRequestsTable.id, id))
      .limit(1);
    if (row?.alertDeliveryStatus === expectedStatus) return row;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  assert.fail(`Demo request ${id} did not reach ${expectedStatus}`);
}

test("valid submission is persisted and returns 201 with an id", async () => {
  const email = `lead@${MARKER}.example.com`;
  const res = await post({ name: "Lead", leadType: "AGENCY", email }, "203.0.113.11");
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
  assert.equal(rows[0]?.leadType, "AGENCY");
});

test("alert delivery statuses persist across a listener restart without changing 201 submissions", async () => {
  const previousRecipients = process.env.DEMO_ALERT_EMAILS;
  const submitted: Array<{ id: string; status: string }> = [];
  const scenarios = [
    {
      expectedStatus: "SENT",
      recipients: `demo-sent@${MARKER}.example.com`,
      rejected: [],
    },
    {
      expectedStatus: "PARTIAL",
      recipients: `demo-partial-ok@${MARKER}.example.com, demo-partial-failed@${MARKER}.example.com`,
      rejected: [`demo-partial-failed@${MARKER}.example.com`],
    },
    {
      expectedStatus: "FAILED",
      recipients: `demo-failed@${MARKER}.example.com`,
      rejected: [`demo-failed@${MARKER}.example.com`],
    },
  ] as const;

  try {
    for (const [index, scenario] of scenarios.entries()) {
      process.env.DEMO_ALERT_EMAILS = scenario.recipients;
      rejectedRecipients.clear();
      for (const recipient of scenario.rejected) rejectedRecipients.add(recipient);

      const response = await post(
        {
          name: `Delivery status ${scenario.expectedStatus}`,
          leadType: "AGENCY",
          email: `delivery-${scenario.expectedStatus.toLowerCase()}@${MARKER}.example.com`,
        },
        `203.0.113.${40 + index}`,
      );
      assert.equal(response.status, 201);
      const body = (await response.json()) as { id?: string; code?: string };
      assert.ok(body.id, "a delivery issue must not replace the submission success response");

      await waitForDemoAlertStatus(body.id, scenario.expectedStatus);
      submitted.push({ id: body.id, status: scenario.expectedStatus });
    }

    await stopServer();
    await startServer();

    for (const submission of submitted) {
      await waitForDemoAlertStatus(submission.id, submission.status);
    }
  } finally {
    rejectedRecipients.clear();
    if (previousRecipients === undefined) delete process.env.DEMO_ALERT_EMAILS;
    else process.env.DEMO_ALERT_EMAILS = previousRecipients;
  }
});

test("filled honeypot returns benign 201 but does not persist", async () => {
  const email = `bot@${MARKER}.example.com`;
  const res = await post(
    { name: "Bot", leadType: "SINGLE_SHOP", email, website: "http://spam.example" },
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
