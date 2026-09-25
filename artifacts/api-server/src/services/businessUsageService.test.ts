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
  getBusinessUsageBilling,
  getBusinessUsageHistory,
  getBusinessUsageSummary,
  monthlyMetaMultiplier,
  recordImportedSocialComments,
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

  const activeConfigs = Object.entries(BUSINESS_USAGE_CONFIG).filter(
    ([metric]) => metric !== "SOCIAL_COMMENT_REPLIES",
  ) as [
    keyof typeof BUSINESS_USAGE_CONFIG,
    (typeof BUSINESS_USAGE_CONFIG)[keyof typeof BUSINESS_USAGE_CONFIG],
  ][];
  for (const [metric, config] of activeConfigs) {
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
    if (config.allowMonthlyOverage) {
      // This category intentionally permits monthly tiers above its base.
    } else {
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
    }

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
  assert.equal(reservations.length, activeConfigs.length * 2);
  assert.ok(reservations.every((reservation) => reservation.status !== "PENDING"));

  const [firstHistory, secondHistory] = await Promise.all([
    getBusinessUsageHistory(organizationId, firstBusinessId),
    getBusinessUsageHistory(organizationId, secondBusinessId),
  ]);
  assert.equal(
    firstHistory.length,
    activeConfigs.length,
    "history should include only the first business's reservations",
  );
  assert.equal(
    secondHistory.length,
    activeConfigs.length,
    "history should include only the second business's reservations",
  );
  assert.ok(firstHistory.every((item) => item.status === "SUCCEEDED"));
  assert.ok(secondHistory.every((item) => item.status === "FAILED"));
});

test("UTC daily and monthly windows reset at their exact boundaries", async () => {
  const beforeMidnight = new Date("2026-10-31T23:59:59.000Z");
  const afterMidnight = new Date("2026-11-01T00:00:00.000Z");
  const reservation = await reserveBusinessUsage({
    organizationId,
    businessId: firstBusinessId,
    metric: "SOCIAL_POSTS",
    now: beforeMidnight,
  });
  await completeBusinessUsageReservation(reservation.id);

  const summary = await getBusinessUsageSummary(
    organizationId,
    firstBusinessId,
    afterMidnight,
  );
  const postsToday = summary.find((item) => item.metric === "SOCIAL_POSTS");
  const postsThisMonth = summary.find(
    (item) => item.metric === "SOCIAL_POSTS_MONTHLY",
  );
  assert.equal(postsToday?.used, 0);
  assert.equal(postsToday?.periodStart, "2026-11-01T00:00:00.000Z");
  assert.equal(postsThisMonth?.periodStart, "2026-11-01T00:00:00.000Z");
});

test("expired incomplete media reservations release cap capacity on usage refresh", async () => {
  const now = new Date();
  const stale = new Date(now.getTime() - 16 * 60_000);
  const daily = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_MEDIA_UPLOADS",
    now,
    providerAttemptId: `social-media-upload:/objects/uploads/stale-media-${runId}`,
  });
  const monthly = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_MEDIA_UPLOADS_MONTHLY",
    now,
    providerAttemptId: `social-media-upload:/objects/uploads/stale-media-${runId}`,
    allowMonthlyOverage: true,
  });
  await Promise.all(
    [daily.id, monthly.id].map((id) =>
      db
        .update(businessUsageReservationsTable)
        .set({ createdAt: stale, updatedAt: stale })
        .where(eq(businessUsageReservationsTable.id, id)),
    ),
  );

  const usage = await getBusinessUsageSummary(
    organizationId,
    secondBusinessId,
    now,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_MEDIA_UPLOADS")?.reserved,
    0,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_MEDIA_UPLOADS_MONTHLY")?.reserved,
    0,
  );
  const [dailyHistory, monthlyHistory] = await Promise.all(
    [daily.id, monthly.id].map(async (id) => {
      const [row] = await db
        .select({ status: businessUsageReservationsTable.status })
        .from(businessUsageReservationsTable)
        .where(eq(businessUsageReservationsTable.id, id));
      return row?.status;
    }),
  );
  assert.deepEqual([dailyHistory, monthlyHistory], ["FAILED", "FAILED"]);
});

test("monthly Meta tiers use block boundaries and one highest multiplier", async () => {
  assert.equal(monthlyMetaMultiplier(0, 25), 1);
  assert.equal(monthlyMetaMultiplier(25, 25), 1);
  assert.equal(monthlyMetaMultiplier(26, 25), 2);
  assert.equal(monthlyMetaMultiplier(50, 25), 2);
  assert.equal(monthlyMetaMultiplier(51, 25), 3);

  const now = new Date("2026-04-15T12:00:00.000Z");
  await db
    .update(businessesTable)
    .set({
      quotedMonthlyBaseAmountCents: 12_500,
      quotedMonthlyCurrency: "USD",
    })
    .where(eq(businessesTable.id, secondBusinessId));

  const postReservation = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_POSTS_MONTHLY",
    amount: 51,
    now,
    allowMonthlyOverage: true,
  });
  const mediaReservation = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_MEDIA_UPLOADS_MONTHLY",
    amount: 1_001,
    now,
    allowMonthlyOverage: true,
  });
  const pendingBilling = await getBusinessUsageBilling(
    organizationId,
    secondBusinessId,
    now,
  );
  assert.equal(
    pendingBilling.highestMultiplier,
    1,
    "incomplete reservations must not increase manual invoice estimates",
  );
  await Promise.all([
    completeBusinessUsageReservation(postReservation.id),
    completeBusinessUsageReservation(mediaReservation.id),
  ]);

  const billing = await getBusinessUsageBilling(
    organizationId,
    secondBusinessId,
    now,
  );
  assert.equal(billing.highestMultiplier, 3);
  assert.equal(billing.manualInvoiceTotalCents, 37_500);
  assert.equal(
    billing.categories.find((item) => item.metric === "SOCIAL_POSTS_MONTHLY")
      ?.multiplier,
    2,
  );
  assert.equal(
    billing.categories.find(
      (item) => item.metric === "SOCIAL_MEDIA_UPLOADS_MONTHLY",
    )?.multiplier,
    3,
  );
});

test("provider comment imports count each newly observed comment once", async () => {
  const now = new Date("2026-05-18T12:00:00.000Z");
  const first = await recordImportedSocialComments({
    organizationId,
    businessId: firstBusinessId,
    comments: [{ id: "comment-once", postId: "post-1" }],
    now,
  });
  const repeated = await recordImportedSocialComments({
    organizationId,
    businessId: firstBusinessId,
    comments: [
      { id: "comment-once", postId: "post-1" },
      { id: "comment-two", postId: "post-1" },
    ],
    now,
  });
  assert.deepEqual([...first], ["comment-once"]);
  assert.deepEqual([...repeated], ["comment-two"]);
  const usage = await getBusinessUsageSummary(
    organizationId,
    firstBusinessId,
    now,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_IMPORTS")?.used,
    2,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    2,
  );
});

test("only new comments that fit the remaining daily units are imported", async () => {
  const now = new Date("2026-07-18T12:00:00.000Z");
  const fill = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_COMMENT_DAILY_UNITS",
    amount: 4,
    now,
  });
  await completeBusinessUsageReservation(fill.id);

  const imported = await recordImportedSocialComments({
    organizationId,
    businessId: secondBusinessId,
    comments: [
      { id: "daily-comment-one", postId: "post-2" },
      { id: "daily-comment-two", postId: "post-2" },
    ],
    now,
  });
  const repeated = await recordImportedSocialComments({
    organizationId,
    businessId: secondBusinessId,
    comments: [
      { id: "daily-comment-one", postId: "post-2" },
      { id: "daily-comment-two", postId: "post-2" },
    ],
    now,
  });
  const usage = await getBusinessUsageSummary(
    organizationId,
    secondBusinessId,
    now,
  );

  assert.deepEqual([...imported], ["daily-comment-one"]);
  assert.deepEqual([...repeated], []);
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    5,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_IMPORTS")?.used,
    1,
  );
});

test("warning thresholds activate at 80 percent using completed plus reserved usage", async () => {
  const now = new Date("2026-12-04T10:00:00.000Z");
  const reservation = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_POSTS",
    amount: 8,
    now,
  });
  const summary = await getBusinessUsageSummary(
    organizationId,
    secondBusinessId,
    now,
  );
  const posts = summary.find((item) => item.metric === "SOCIAL_POSTS");
  assert.equal(posts?.warningThresholdPercent, 80);
  assert.equal(posts?.nearLimit, true);
  await releaseBusinessUsageReservation(reservation.id);
});