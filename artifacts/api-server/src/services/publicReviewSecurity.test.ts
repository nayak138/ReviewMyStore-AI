import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  businessesTable,
  campaignsTable,
  db,
  organizationsTable,
  pool,
  reviewGenerationReservationsTable,
  reviewSessionsTable,
} from "@workspace/db";
import {
  generatePublicReview,
  getPublicReviewPage,
  OrganizationQuotaExhaustedError,
  PublicCampaignNotFoundError,
  SessionCampaignMismatchError,
} from "./publicReviewService";
import { AIGenerationError } from "./aiService";

const runId = randomUUID().slice(0, 8);
const originalCreate = openrouter.chat.completions.create;
let orgId: string;
let businessId: string;
let activeCampaignId: string;
let secondCampaignId: string;

before(async () => {
  const [organization] = await db
    .insert(organizationsTable)
    .values({
      name: `Security Test Org ${runId}`,
      slug: `security-test-org-${runId}`,
      aiQuota: 20,
    })
    .returning();
  orgId = organization.id;

  const [business] = await db
    .insert(businessesTable)
    .values({
      organizationId: orgId,
      name: "Security Test Store",
      category: "Retail",
      slug: `security-test-store-${runId}`,
      status: "ACTIVE",
    })
    .returning();
  businessId = business.id;

  const [activeCampaign, secondCampaign] = await db
    .insert(campaignsTable)
    .values([
      {
        businessId,
        name: "Active campaign",
        slug: `active-${runId}`,
        status: "ACTIVE",
      },
      {
        businessId,
        name: "Second campaign",
        slug: `second-${runId}`,
        status: "ACTIVE",
      },
    ])
    .returning();
  activeCampaignId = activeCampaign.id;
  secondCampaignId = secondCampaign.id;
});

beforeEach(() => {
  openrouter.chat.completions.create = (async () => ({
    choices: [{ message: { content: "A generated review." } }],
  })) as unknown as typeof openrouter.chat.completions.create;
});

after(async () => {
  openrouter.chat.completions.create = originalCreate;
  if (orgId) {
    await db
      .delete(reviewGenerationReservationsTable)
      .where(eq(reviewGenerationReservationsTable.organizationId, orgId));
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  }
  await pool.end();
});

test("public review page rejects every inactive lifecycle state", async () => {
  const cases = [
    {
      label: "suspended business",
      update: () =>
        db
          .update(businessesTable)
          .set({ status: "SUSPENDED" })
          .where(eq(businessesTable.id, businessId)),
      restore: () =>
        db
          .update(businessesTable)
          .set({ status: "ACTIVE" })
          .where(eq(businessesTable.id, businessId)),
    },
    {
      label: "disabled business",
      update: () =>
        db
          .update(businessesTable)
          .set({ status: "DISABLED" })
          .where(eq(businessesTable.id, businessId)),
      restore: () =>
        db
          .update(businessesTable)
          .set({ status: "ACTIVE" })
          .where(eq(businessesTable.id, businessId)),
    },
    {
      label: "archived business",
      update: () =>
        db
          .update(businessesTable)
          .set({ archivedAt: new Date() })
          .where(eq(businessesTable.id, businessId)),
      restore: () =>
        db
          .update(businessesTable)
          .set({ archivedAt: null })
          .where(eq(businessesTable.id, businessId)),
    },
    {
      label: "deleted business",
      update: () =>
        db
          .update(businessesTable)
          .set({ deletedAt: new Date() })
          .where(eq(businessesTable.id, businessId)),
      restore: () =>
        db
          .update(businessesTable)
          .set({ deletedAt: null })
          .where(eq(businessesTable.id, businessId)),
    },
    {
      label: "draft campaign",
      update: () =>
        db
          .update(campaignsTable)
          .set({ status: "DRAFT" })
          .where(eq(campaignsTable.id, activeCampaignId)),
      restore: () =>
        db
          .update(campaignsTable)
          .set({ status: "ACTIVE" })
          .where(eq(campaignsTable.id, activeCampaignId)),
    },
    {
      label: "archived campaign",
      update: () =>
        db
          .update(campaignsTable)
          .set({ archivedAt: new Date() })
          .where(eq(campaignsTable.id, activeCampaignId)),
      restore: () =>
        db
          .update(campaignsTable)
          .set({ archivedAt: null })
          .where(eq(campaignsTable.id, activeCampaignId)),
    },
    {
      label: "deleted campaign",
      update: () =>
        db
          .update(campaignsTable)
          .set({ deletedAt: new Date() })
          .where(eq(campaignsTable.id, activeCampaignId)),
      restore: () =>
        db
          .update(campaignsTable)
          .set({ deletedAt: null })
          .where(eq(campaignsTable.id, activeCampaignId)),
    },
    {
      label: "disabled campaign",
      update: () =>
        db
          .update(campaignsTable)
          .set({ status: "DISABLED" })
          .where(eq(campaignsTable.id, activeCampaignId)),
      restore: () =>
        db
          .update(campaignsTable)
          .set({ status: "ACTIVE" })
          .where(eq(campaignsTable.id, activeCampaignId)),
    },
  ];

  for (const lifecycleCase of cases) {
    await lifecycleCase.update();
    await assert.rejects(
      getPublicReviewPage(
        `security-test-store-${runId}`,
        `active-${runId}`,
      ),
      (error: unknown) => error instanceof PublicCampaignNotFoundError,
      lifecycleCase.label,
    );
    await lifecycleCase.restore();
  }
});

test("a session token cannot be reused across campaigns", async () => {
  const sessionId = `security-session-${runId}`;
  await generatePublicReview(
    `security-test-store-${runId}`,
    `active-${runId}`,
    sessionId,
    ["helpful staff"],
  );
  await assert.rejects(
    generatePublicReview(
      `security-test-store-${runId}`,
      `second-${runId}`,
      sessionId,
      ["helpful staff"],
    ),
    (error: unknown) => error instanceof SessionCampaignMismatchError,
  );
});

test("concurrent generation attempts reserve no more than three session slots", async () => {
  const sessionId = `concurrent-session-${runId}`;
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      generatePublicReview(
        `security-test-store-${runId}`,
        `active-${runId}`,
        sessionId,
        ["quick service"],
      ),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    3,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof Error &&
        result.reason.name === "RegenerationLimitReachedError",
    ).length,
    2,
  );

  const [session] = await db
    .select()
    .from(reviewSessionsTable)
    .where(
      and(
        eq(reviewSessionsTable.id, sessionId),
        eq(reviewSessionsTable.campaignId, activeCampaignId),
      ),
    );
  assert.equal(session.generationCount, 3);
});

test("organization quota rejects generation when the atomic allowance is empty", async () => {
  await db
    .update(organizationsTable)
    .set({ aiQuota: 0 })
    .where(eq(organizationsTable.id, orgId));

  await assert.rejects(
    generatePublicReview(
      `security-test-store-${runId}`,
      `active-${runId}`,
      `quota-session-${runId}`,
      ["friendly team"],
    ),
    (error: unknown) => error instanceof OrganizationQuotaExhaustedError,
  );
});

test("provider failure restores the organization quota and session attempt", async () => {
  await db
    .update(organizationsTable)
    .set({ aiQuota: 7 })
    .where(eq(organizationsTable.id, orgId));
  openrouter.chat.completions.create = (async () => {
    throw new Error("temporary provider timeout");
  }) as unknown as typeof openrouter.chat.completions.create;

  const sessionId = `failed-generation-session-${runId}`;
  await assert.rejects(
    generatePublicReview(
      `security-test-store-${runId}`,
      `active-${runId}`,
      sessionId,
      ["helpful staff"],
    ),
    (error: unknown) => error instanceof AIGenerationError,
  );

  const [organization] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));
  const [session] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));
  assert.equal(organization.aiQuota, 7);
  assert.equal(session.generationCount, 0);
});

test("a transient provider failure can be retried with the same quota and session", async () => {
  await db
    .update(organizationsTable)
    .set({ aiQuota: 1 })
    .where(eq(organizationsTable.id, orgId));
  let shouldFail = true;
  openrouter.chat.completions.create = (async () => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error("transient provider error");
    }
    return { choices: [{ message: { content: "Retry succeeded." } }] };
  }) as unknown as typeof openrouter.chat.completions.create;

  const sessionId = `retry-generation-session-${runId}`;
  await assert.rejects(
    generatePublicReview(
      `security-test-store-${runId}`,
      `active-${runId}`,
      sessionId,
      ["friendly team"],
    ),
    (error: unknown) => error instanceof AIGenerationError,
  );
  const result = await generatePublicReview(
    `security-test-store-${runId}`,
    `active-${runId}`,
    sessionId,
    ["friendly team"],
  );

  assert.equal(result.reviewText, "Retry succeeded.");
  assert.equal(result.remainingGenerations, 2);
  const [organization] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));
  const [session] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));
  assert.equal(organization.aiQuota, 0);
  assert.equal(session.generationCount, 1);
});

test("a failed request does not roll back a concurrent successful reservation", async () => {
  await db
    .update(organizationsTable)
    .set({ aiQuota: 2 })
    .where(eq(organizationsTable.id, orgId));

  let providerCall = 0;
  let providerStarted!: () => void;
  const firstProviderStarted = new Promise<void>((resolve) => {
    providerStarted = resolve;
  });
  let releaseFailure!: () => void;
  const failureGate = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  openrouter.chat.completions.create = (async () => {
    providerCall += 1;
    if (providerCall === 1) {
      providerStarted();
      await failureGate;
      throw new Error("first provider call failed");
    }
    return { choices: [{ message: { content: "Concurrent success." } }] };
  }) as unknown as typeof openrouter.chat.completions.create;

  const sessionId = `mixed-generation-session-${runId}`;
  const failedRequest = generatePublicReview(
    `security-test-store-${runId}`,
    `active-${runId}`,
    sessionId,
    ["helpful staff"],
  );
  await firstProviderStarted;

  const successfulRequest = generatePublicReview(
    `security-test-store-${runId}`,
    `active-${runId}`,
    sessionId,
    ["helpful staff"],
  );
  await successfulRequest;
  releaseFailure();

  await assert.rejects(
    failedRequest,
    (error: unknown) => error instanceof AIGenerationError,
  );

  const [organization] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));
  const [session] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));
  assert.equal(organization.aiQuota, 1);
  assert.equal(session.generationCount, 1);
});

test("simultaneous requests cannot drive organization quota below zero", async () => {
  await db
    .update(organizationsTable)
    .set({ aiQuota: 1 })
    .where(eq(organizationsTable.id, orgId));

  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, index) =>
      generatePublicReview(
        `security-test-store-${runId}`,
        `active-${runId}`,
        `quota-floor-session-${runId}-${index}`,
        ["quick service"],
      ),
    ),
  );

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof OrganizationQuotaExhaustedError,
    ).length,
    4,
  );
  const [organization] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));
  assert.equal(organization.aiQuota, 0);
  assert.ok(organization.aiQuota >= 0);
});