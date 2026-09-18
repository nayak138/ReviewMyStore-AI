import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  organizationsTable,
  pool,
  reviewProviderOperationLeasesTable,
} from "@workspace/db";
import {
  ReviewProviderOperationInProgressError,
  withProviderOperationLock,
} from "./reviewManagementService.ts";

const runId = randomUUID().slice(0, 8);
const createdOrgIds: string[] = [];

async function createOrg(label: string) {
  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: `Lease Test ${label} ${runId}`,
      slug: `lease-test-${label}-${runId}`,
    })
    .returning();
  createdOrgIds.push(org.id);
  return org;
}

after(async () => {
  for (const orgId of createdOrgIds) {
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  }
  await pool.end();
});

test("provider-operation lease prevents overlapping mutations and releases after completion", async () => {
  const org = await createOrg("overlap");
  let enteredFirstOperation!: () => void;
  let releaseFirstOperation!: () => void;
  const firstOperationEntered = new Promise<void>((resolve) => {
    enteredFirstOperation = resolve;
  });
  const releaseFirst = new Promise<void>((resolve) => {
    releaseFirstOperation = resolve;
  });

  const first = withProviderOperationLock(org.id, async () => {
    enteredFirstOperation();
    await releaseFirst;
  });
  await firstOperationEntered;

  await assert.rejects(
    () => withProviderOperationLock(org.id, async () => undefined),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderOperationInProgressError);
      return true;
    },
  );

  releaseFirstOperation();
  await first;

  const leases = await db
    .select()
    .from(reviewProviderOperationLeasesTable)
    .where(eq(reviewProviderOperationLeasesTable.organizationId, org.id));
  assert.deepEqual(leases, []);
});

test("provider-operation lease reclaims an expired holder", async () => {
  const org = await createOrg("expired");
  const staleToken = randomUUID();
  await db.insert(reviewProviderOperationLeasesTable).values({
    organizationId: org.id,
    leaseToken: staleToken,
    expiresAt: new Date(Date.now() - 1_000),
  });

  let operationRan = false;
  await withProviderOperationLock(org.id, async () => {
    operationRan = true;
    const [currentLease] = await db
      .select()
      .from(reviewProviderOperationLeasesTable)
      .where(eq(reviewProviderOperationLeasesTable.organizationId, org.id));
    assert.notEqual(currentLease?.leaseToken, staleToken);
  });
  assert.equal(operationRan, true);

  const leases = await db
    .select()
    .from(reviewProviderOperationLeasesTable)
    .where(eq(reviewProviderOperationLeasesTable.organizationId, org.id));
  assert.deepEqual(leases, []);
});
