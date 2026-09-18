import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
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
  cleanupCompletedGenerationReservations,
  countStaleCompletedGenerationReservations,
  COMPLETED_RESERVATION_RETENTION_DAYS,
  PENDING_RESERVATION_RECOVERY_AGE_MS,
  recoverStalePendingGenerationReservations,
} from "./publicReviewService";

const runId = randomUUID().slice(0, 8);
const campaignSlug = `reservation-cleanup-campaign-${runId}`;
let organizationId: string;
let campaignId: string;
let sessionId: string;

before(async () => {
  const [organization] = await db
    .insert(organizationsTable)
    .values({
      name: `Reservation Cleanup Test Org ${runId}`,
      slug: `reservation-cleanup-org-${runId}`,
      aiQuota: 17,
    })
    .returning();
  organizationId = organization.id;

  const [business] = await db
    .insert(businessesTable)
    .values({
      organizationId,
      name: "Reservation Cleanup Test Store",
      category: "Retail",
      slug: `reservation-cleanup-store-${runId}`,
      status: "ACTIVE",
    })
    .returning();

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      businessId: business.id,
      name: "Reservation cleanup campaign",
      slug: campaignSlug,
      status: "ACTIVE",
    })
    .returning();
  campaignId = campaign.id;

  const [session] = await db
    .insert(reviewSessionsTable)
    .values({
      id: `reservation-cleanup-session-${runId}`,
      campaignId,
      generationCount: 2,
    })
    .returning();
  sessionId = session.id;
});

after(async () => {
  if (organizationId) {
    await db
      .delete(reviewGenerationReservationsTable)
      .where(
        eq(reviewGenerationReservationsTable.organizationId, organizationId),
      );
    await db
      .delete(reviewSessionsTable)
      .where(eq(reviewSessionsTable.id, sessionId));
    await db.delete(campaignsTable).where(eq(campaignsTable.id, campaignId));
    await db
      .delete(businessesTable)
      .where(eq(businessesTable.organizationId, organizationId));
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, organizationId));
  }
  await pool.end();
});

test("removes old completed rows in bounded batches without touching accounting", async () => {
  const now = new Date("2026-08-28T12:00:00.000Z");
  const staleAt = new Date(
    now.getTime() -
      (COMPLETED_RESERVATION_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000,
  );
  const freshAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const reservationIds = {
    staleSucceeded: randomUUID(),
    staleFailed: randomUUID(),
    staleSucceededAgain: randomUUID(),
    pending: randomUUID(),
    freshSucceeded: randomUUID(),
  };

  await db.insert(reviewGenerationReservationsTable).values([
    {
      id: reservationIds.staleSucceeded,
      sessionId,
      campaignId,
      organizationId,
      status: "SUCCEEDED",
      createdAt: staleAt,
      updatedAt: staleAt,
    },
    {
      id: reservationIds.staleFailed,
      sessionId,
      campaignId,
      organizationId,
      status: "FAILED",
      createdAt: staleAt,
      updatedAt: new Date(staleAt.getTime() + 1),
    },
    {
      id: reservationIds.staleSucceededAgain,
      sessionId,
      campaignId,
      organizationId,
      status: "SUCCEEDED",
      createdAt: staleAt,
      updatedAt: new Date(staleAt.getTime() + 2),
    },
    {
      id: reservationIds.pending,
      sessionId,
      campaignId,
      organizationId,
      status: "PENDING",
      createdAt: staleAt,
      updatedAt: staleAt,
    },
    {
      id: reservationIds.freshSucceeded,
      sessionId,
      campaignId,
      organizationId,
      status: "SUCCEEDED",
      createdAt: freshAt,
      updatedAt: freshAt,
    },
  ]);

  const [organizationBefore] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId));
  const [sessionBefore] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));

  assert.equal(
    await cleanupCompletedGenerationReservations({ now, batchSize: 2 }),
    2,
  );

  const afterFirstBatch = await db
    .select({
      id: reviewGenerationReservationsTable.id,
      status: reviewGenerationReservationsTable.status,
    })
    .from(reviewGenerationReservationsTable)
    .where(
      and(
        eq(reviewGenerationReservationsTable.organizationId, organizationId),
        inArray(
          reviewGenerationReservationsTable.id,
          Object.values(reservationIds),
        ),
      ),
    );
  assert.deepEqual(
    new Set(afterFirstBatch.map(({ id }) => id)),
    new Set([
      reservationIds.staleSucceededAgain,
      reservationIds.pending,
      reservationIds.freshSucceeded,
    ]),
  );
  assert.equal(await countStaleCompletedGenerationReservations({ now }), 1);

  assert.equal(
    await cleanupCompletedGenerationReservations({ now, batchSize: 2 }),
    1,
  );

  const remaining = await db
    .select({
      id: reviewGenerationReservationsTable.id,
      status: reviewGenerationReservationsTable.status,
    })
    .from(reviewGenerationReservationsTable)
    .where(
      and(
        eq(reviewGenerationReservationsTable.organizationId, organizationId),
        inArray(
          reviewGenerationReservationsTable.id,
          Object.values(reservationIds),
        ),
      ),
    );
  assert.deepEqual(
    Object.fromEntries(remaining.map(({ id, status }) => [id, status])),
    {
      [reservationIds.pending]: "PENDING",
      [reservationIds.freshSucceeded]: "SUCCEEDED",
    },
  );

  const [organizationAfter] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId));
  const [sessionAfter] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));
  assert.equal(organizationAfter.aiQuota, organizationBefore.aiQuota);
  assert.equal(sessionAfter.generationCount, sessionBefore.generationCount);
  assert.equal(await countStaleCompletedGenerationReservations({ now }), 0);

  // This row is deliberately an accounting-free fixture for the retention
  // test above. Remove it so the recovery test below only evaluates rows that
  // actually represent a held quota and generation slot.
  await db
    .delete(reviewGenerationReservationsTable)
    .where(eq(reviewGenerationReservationsTable.id, reservationIds.pending));
});

test("releases only pending reservations older than the bounded provider lifetime", async () => {
  const now = new Date("2026-08-28T12:00:00.000Z");
  const staleAt = new Date(
    now.getTime() - PENDING_RESERVATION_RECOVERY_AGE_MS - 1,
  );
  const freshAt = new Date(
    now.getTime() - PENDING_RESERVATION_RECOVERY_AGE_MS + 1,
  );
  const staleReservationId = randomUUID();
  const freshReservationId = randomUUID();

  await db
    .update(organizationsTable)
    .set({ aiQuota: 15, updatedAt: now })
    .where(eq(organizationsTable.id, organizationId));
  await db
    .update(reviewSessionsTable)
    .set({ generationCount: 4, updatedAt: now })
    .where(eq(reviewSessionsTable.id, sessionId));
  await db.insert(reviewGenerationReservationsTable).values([
    {
      id: staleReservationId,
      sessionId,
      campaignId,
      organizationId,
      status: "PENDING",
      createdAt: staleAt,
      updatedAt: staleAt,
    },
    {
      id: freshReservationId,
      sessionId,
      campaignId,
      organizationId,
      status: "PENDING",
      createdAt: freshAt,
      updatedAt: freshAt,
    },
  ]);

  assert.equal(
    await recoverStalePendingGenerationReservations({ now, batchSize: 10 }),
    1,
  );

  const reservations = await db
    .select({
      id: reviewGenerationReservationsTable.id,
      status: reviewGenerationReservationsTable.status,
    })
    .from(reviewGenerationReservationsTable)
    .where(
      inArray(reviewGenerationReservationsTable.id, [
        staleReservationId,
        freshReservationId,
      ]),
    );
  assert.deepEqual(
    Object.fromEntries(reservations.map(({ id, status }) => [id, status])),
    {
      [staleReservationId]: "FAILED",
      [freshReservationId]: "PENDING",
    },
  );

  const [organization] = await db
    .select({ aiQuota: organizationsTable.aiQuota })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId));
  const [session] = await db
    .select({ generationCount: reviewSessionsTable.generationCount })
    .from(reviewSessionsTable)
    .where(eq(reviewSessionsTable.id, sessionId));
  assert.equal(organization.aiQuota, 16);
  assert.equal(session.generationCount, 3);
});
