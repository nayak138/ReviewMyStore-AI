import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  businessesTable,
  businessUsageReservationsTable,
  db,
  organizationsTable,
  pool,
} from "@workspace/db";
import {
  BUSINESS_USAGE_CONFIG,
  BusinessUsageLimitError,
  completeBusinessUsageReservation,
  getBusinessUsageHistory,
  getBusinessUsageSummary,
  releaseBusinessUsageReservation,
  reserveBusinessUsage,
} from "./businessUsageService";

const runId = randomUUID().slice(0, 8);
let organizationId: string;
let firstBusinessId: string;
let secondBusinessId: string;

before(async () => {
  const [organization] = await db
    .insert(organizationsTable)
    .values({
      name: `Business usage test org ${runId}`,
      slug: `business-usage-test-${runId}`,
    })
    .returning();
  organizationId = organization.id;

  const [firstBusiness, secondBusiness] = await db
    .insert(businessesTable)
    .values([
      {
        organizationId,
        name: "First usage test store",
        category: "Retail",
        slug: `first-usage-store-${runId}`,
        status: "ACTIVE",
      },
      {
        organizationId,
        name: "Second usage test store",
        category: "Retail",
        slug: `second-usage-store-${runId}`,
        status: "ACTIVE",
      },
    ])
    .returning();
  firstBusinessId = firstBusiness.id;
  secondBusinessId = secondBusiness.id;
});

after(async () => {
  if (organizationId) {
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, organizationId));
  }
  await pool.end();
});

test("each metered action is isolated by business and releases failed work", async () => {
  const now = new Date("2026-09-22T12:00:00.000Z");

  for (const [metric, config] of Object.entries(BUSINESS_USAGE_CONFIG) as [
    keyof typeof BUSINESS_USAGE_CONFIG,
    (typeof BUSINESS_USAGE_CONFIG)[keyof typeof BUSINESS_USAGE_CONFIG],
  ][]) {
    const successfulReservation = await reserveBusinessUsage({
      organizationId,
      businessId: firstBusinessId,
      metric,
      amount: config.limit,
      now,
    });

    assert.equal(
      successfulReservation.remaining,
      0,
      `${metric} should reserve the entire first business allowance`,
    );
    await assert.rejects(
      () =>
        reserveBusinessUsage({
          organizationId,
          businessId: firstBusinessId,
          metric,
          now,
        }),
      (error: unknown) => {
        assert.ok(error instanceof BusinessUsageLimitError);
        assert.equal(error.metric, metric);
        assert.equal(error.limit, config.limit);
        return true;
      },
      `${metric} should enforce the first business limit`,
    );

    const failedReservation = await reserveBusinessUsage({
      organizationId,
      businessId: secondBusinessId,
      metric,
      now,
    });
    assert.equal(
      failedReservation.remaining,
      config.limit - 1,
      `${metric} allowance must not be shared across businesses`,
    );

    assert.equal(
      await completeBusinessUsageReservation(successfulReservation.id),
      true,
    );
    assert.equal(
      await releaseBusinessUsageReservation(failedReservation.id),
      true,
    );

    const [firstSummary, secondSummary] = await Promise.all([
      getBusinessUsageSummary(organizationId, firstBusinessId, now),
      getBusinessUsageSummary(organizationId, secondBusinessId, now),
    ]);
    const firstMetric = firstSummary.find((item) => item.metric === metric);
    const secondMetric = secondSummary.find((item) => item.metric === metric);
    assert.deepEqual(
      {
        used: firstMetric?.used,
        reserved: firstMetric?.reserved,
        remaining: firstMetric?.remaining,
      },
      { used: config.limit, reserved: 0, remaining: 0 },
      `${metric} successful work should settle against its own business`,
    );
    assert.deepEqual(
      {
        used: secondMetric?.used,
        reserved: secondMetric?.reserved,
        remaining: secondMetric?.remaining,
      },
      { used: 0, reserved: 0, remaining: config.limit },
      `${metric} failed work should release its other business reservation`,
    );
  }

  const reservations = await db
    .select({
      businessId: businessUsageReservationsTable.businessId,
      metric: businessUsageReservationsTable.metric,
      status: businessUsageReservationsTable.status,
    })
    .from(businessUsageReservationsTable)
    .where(eq(businessUsageReservationsTable.organizationId, organizationId));
  assert.equal(reservations.length, Object.keys(BUSINESS_USAGE_CONFIG).length * 2);
  assert.ok(reservations.every((reservation) => reservation.status !== "PENDING"));

  const [firstHistory, secondHistory] = await Promise.all([
    getBusinessUsageHistory(organizationId, firstBusinessId),
    getBusinessUsageHistory(organizationId, secondBusinessId),
  ]);
  assert.equal(
    firstHistory.length,
    Object.keys(BUSINESS_USAGE_CONFIG).length,
    "history should include only the first business's reservations",
  );
  assert.equal(
    secondHistory.length,
    Object.keys(BUSINESS_USAGE_CONFIG).length,
    "history should include only the second business's reservations",
  );
  assert.ok(firstHistory.every((item) => item.status === "SUCCEEDED"));
  assert.ok(secondHistory.every((item) => item.status === "FAILED"));
});