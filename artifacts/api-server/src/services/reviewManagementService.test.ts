// This import must run before anything that pulls in the OpenAI client: it
// installs the fake fetch at load time, and the OpenAI SDK captures
// `globalThis.fetch` when the client is constructed at module import.
import {
  bndleCalls,
  providerFetch,
  recorded,
  resetCalls,
  restoreFetch,
} from "../testSupport/fakeProviderFetch.ts";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  pool,
  managedReviewsTable,
  organizationsTable,
  providerConnectionsTable,
  reviewAuditEventsTable,
  reviewLocationsTable,
  usersTable,
} from "@workspace/db";
import {
  ManagedReviewNotFoundError,
  ReviewProviderError,
  deleteManagedReviewReply,
  generateManagedReviewDraft,
  getReviewDashboard,
  getReviewProviderConnectionLocations,
  listManagedReviews,
  publishManagedReviewReply,
  selectReviewProviderLocation,
  startReviewProviderConnection,
  syncReviewProvider,
} from "./reviewManagementService.ts";

/**
 * Service-level tests for the Google-review management workflow backed by
 * the bundle.social provider API (team-per-organization, async imports).
 *
 * The provider (and the AI provider for draft tests) is faked by a fetch
 * patch installed at module load, while the real development database is
 * used with throwaway organizations removed afterwards. Covered:
 *
 *  - disconnected / not-configured provider states surface typed, safe errors
 *  - provider sync normalization (star-rating mapping, reviewer fallbacks,
 *    reply → status mapping, sensitive-review flags, non-Google accounts
 *    filtered, import problems surfaced as a note instead of a hard failure)
 *  - organization ownership checks on every review mutation
 *  - reply publishing safety: empty/oversized replies rejected, provider
 *    failures leave local state untouched, retries of an already-published
 *    reply are idempotent (no second provider call)
 *  - AI drafts are stored as unpublished drafts that still require approval
 */

const runId = randomUUID().slice(0, 8);
const createdOrgIds: string[] = [];

async function createOrg(label: string) {
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: `RM Test ${label} ${runId}`, slug: `rm-test-${label}-${runId}` })
    .returning();
  createdOrgIds.push(org.id);
  return org;
}

async function createConnection(organizationId: string, teamId: string) {
  const [connection] = await db
    .insert(providerConnectionsTable)
    .values({
      organizationId,
      provider: "BNDLE",
      externalProfileId: teamId,
      status: "CONNECTED",
    })
    .returning();
  return connection;
}

async function createLocation(
  organizationId: string,
  providerConnectionId: string,
  overrides: Partial<typeof reviewLocationsTable.$inferInsert> = {},
) {
  const [location] = await db
    .insert(reviewLocationsTable)
    .values({
      organizationId,
      providerConnectionId,
      externalAccountId: `acc-${randomUUID().slice(0, 8)}`,
      externalLocationId: `loc-${randomUUID().slice(0, 8)}`,
      name: "Test Store",
      ...overrides,
    })
    .returning();
  return location;
}

async function createReview(
  organizationId: string,
  reviewLocationId: string,
  overrides: Partial<typeof managedReviewsTable.$inferInsert> = {},
) {
  const [review] = await db
    .insert(managedReviewsTable)
    .values({
      organizationId,
      reviewLocationId,
      externalReviewId: `ext-${randomUUID().slice(0, 8)}`,
      reviewerName: "Test Reviewer",
      rating: 4,
      comment: "Nice store",
      responseStatus: "PENDING",
      ...overrides,
    })
    .returning();
  return review;
}

async function createUser(organizationId: string, label: string) {
  const [user] = await db
    .insert(usersTable)
    .values({
      organizationId,
      clerkUserId: `user_test_${label}_${runId}`,
      name: `Test ${label}`,
      email: `rm-test-${label}-${runId}@example.com`,
      role: "OWNER",
      status: "ACTIVE",
    })
    .returning();
  return user;
}

after(async () => {
  restoreFetch();
  for (const orgId of createdOrgIds) {
    await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  }
  await pool.end();
});

// ---------------------------------------------------------------------------
// Disconnected / not-configured provider states
// ---------------------------------------------------------------------------

test("dashboard reports DISCONNECTED when the organization has no provider connection", async () => {
  const org = await createOrg("disc");
  const dashboard = await getReviewDashboard(org.id);
  assert.equal(dashboard.connection.status, "DISCONNECTED");
  assert.equal(dashboard.connection.lastSyncedAt, null);
  assert.deepEqual(dashboard.locations, []);
  assert.deepEqual(dashboard.summary, {
    totalReviews: 0,
    needsReply: 0,
    replied: 0,
  });
});

test("sync without a connection fails with REVIEW_PROVIDER_NOT_CONNECTED and never calls the provider", async () => {
  const org = await createOrg("nosync");
  resetCalls();
  await assert.rejects(
    () => syncReviewProvider(org.id),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderError);
      assert.equal(error.code, "REVIEW_PROVIDER_NOT_CONNECTED");
      assert.equal(error.status, 409);
      return true;
    },
  );
  assert.equal(bndleCalls().length, 0, "no provider request should be made");
});

test("a missing provider API key fails with 503 and leaves the connection status untouched", async () => {
  const org = await createOrg("nokey");
  const connection = await createConnection(org.id, `team-nokey-${runId}`);
  const savedKey = process.env.BNDLE_SOCIAL_API;
  delete process.env.BNDLE_SOCIAL_API;
  try {
    await assert.rejects(
      () => syncReviewProvider(org.id),
      (error: unknown) => {
        assert.ok(error instanceof ReviewProviderError);
        assert.equal(error.code, "REVIEW_PROVIDER_NOT_CONFIGURED");
        assert.equal(error.status, 503);
        return true;
      },
    );
  } finally {
    if (savedKey !== undefined) process.env.BNDLE_SOCIAL_API = savedKey;
  }
  const [row] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(
    row.status,
    "CONNECTED",
    "a server misconfiguration must not flag the owner's connection as broken",
  );
});

test("a provider 401 (our API key) maps to NOT_CONFIGURED and does not blame the owner's connection", async () => {
  const org = await createOrg("badkey");
  const connection = await createConnection(org.id, `team-badkey-${runId}`);
  providerFetch.handler = () => ({ status: 401, body: { message: "bad key" } });
  await assert.rejects(
    () => syncReviewProvider(org.id),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderError);
      assert.equal(error.code, "REVIEW_PROVIDER_NOT_CONFIGURED");
      assert.equal(error.status, 503);
      assert.match(error.message, /administrator/i);
      return true;
    },
  );
  const [row] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(
    row.status,
    "CONNECTED",
    "an invalid platform key must not flip the owner's connection to ERROR",
  );
});

test("provider 5xx maps to a generic 502, marks the connection ERROR, and leaks nothing", async () => {
  const org = await createOrg("prov500");
  const connection = await createConnection(org.id, `team-500-${runId}`);
  providerFetch.handler = () => ({
    status: 500,
    body: { error: "pg: FATAL secret-internal-detail stack trace" },
  });
  await assert.rejects(
    () => syncReviewProvider(org.id),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderError);
      assert.equal(error.code, "REVIEW_PROVIDER_ERROR");
      assert.equal(error.status, 502);
      assert.ok(
        !error.message.includes("secret-internal-detail"),
        "provider internals must not leak into the user-facing message",
      );
      return true;
    },
  );
  const [row] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(row.status, "ERROR");
  assert.ok(row.lastError, "lastError should be recorded for the owner to see");
  assert.ok(!row.lastError?.includes("secret-internal-detail"));
});

test("provider 429 maps to REVIEW_PROVIDER_RATE_LIMITED", async () => {
  const org = await createOrg("prov429");
  await createConnection(org.id, `team-429-${runId}`);
  providerFetch.handler = () => ({ status: 429, body: {} });
  await assert.rejects(
    () => syncReviewProvider(org.id),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderError);
      assert.equal(error.code, "REVIEW_PROVIDER_RATE_LIMITED");
      assert.equal(error.status, 429);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// Provider sync normalization
// ---------------------------------------------------------------------------

function installSyncHandler(
  teamId: string,
  options: { failImportStart?: boolean } = {},
) {
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith(`/team/${teamId}`) && method === "GET") {
      return {
        body: {
          socialAccounts: [
            {
              id: "sa-1",
              type: "GOOGLE_BUSINESS",
              displayName: "Downtown Store",
              externalId: "ch-1",
              channels: [
                { id: "ch-1", name: "Downtown", address: "1 Main St" },
                { id: "ch-2", name: "Uptown", address: "9 High St" },
              ],
            },
            { id: "ig-1", type: "INSTAGRAM", displayName: "Insta Account" },
          ],
        },
      };
    }
    if (path.endsWith("/misc/google-business/reviews/import")) {
      if (method === "POST") {
        return options.failImportStart
          ? { status: 500, body: { error: "import exploded upstream" } }
          : { body: {} };
      }
      return { body: { imports: [{ status: "COMPLETED" }] } };
    }
    if (path.endsWith("/misc/google-business/reviews") && method === "GET") {
      return {
        body: {
          total: 6,
          reviews: [
            {
              id: "r-1",
              socialAccountId: "sa-1",
              externalReviewId: "accounts/1/locations/1/reviews/r-1",
              reviewerDisplayName: "Alice",
              reviewerProfilePhotoUrl: "https://example.com/alice.png",
              starRating: "FIVE",
              comment: "Great coffee and friendly staff!",
              createTime: "2026-08-01T10:00:00Z",
              updateTime: "2026-08-02T10:00:00Z",
              reviewReplyComment: "Thanks Alice!",
              reviewReplyUpdatedAt: "2026-08-03T09:00:00Z",
            },
            { id: "r-2", socialAccountId: "sa-1", starRating: "ONE" },
            {
              id: "r-3",
              socialAccountId: "sa-1",
              reviewerDisplayName: "Bob",
              starRating: "FIVE",
              comment: "Nice place but I want a refund for my order",
            },
            {
              id: "r-4",
              socialAccountId: "sa-1",
              reviewerDisplayName: "Cara",
              starRating: "FOUR",
              comment: "Solid experience overall",
            },
            // No provider id: must be skipped entirely.
            { socialAccountId: "sa-1", starRating: "THREE", comment: "no id" },
            // Unknown social account: no matching location, must be skipped.
            { id: "r-6", socialAccountId: "sa-unknown", starRating: "FIVE" },
          ],
        },
      };
    }
    throw new Error(`Unexpected provider request in sync test: ${method} ${path}`);
  };
}

test("sync normalizes provider payloads into local locations and reviews", async () => {
  const org = await createOrg("sync");
  const teamId = `team-sync-${runId}`;
  const connection = await createConnection(org.id, teamId);
  installSyncHandler(teamId);

  const dashboard = await syncReviewProvider(org.id);

  // Locations: only the GOOGLE_BUSINESS account is mirrored.
  const locations = await db
    .select()
    .from(reviewLocationsTable)
    .where(eq(reviewLocationsTable.organizationId, org.id));
  assert.equal(locations.length, 1);
  assert.equal(locations[0].externalAccountId, "sa-1");
  assert.equal(locations[0].externalLocationId, "ch-1");
  assert.equal(locations[0].name, "Downtown Store");
  assert.equal(locations[0].address, "1 Main St", "address comes from the selected channel");
  assert.equal(locations[0].isSelected, true);

  // Reviews: 4 imported; the id-less record and the unknown-account record
  // are skipped instead of corrupting the inbox.
  const reviews = await db
    .select()
    .from(managedReviewsTable)
    .where(eq(managedReviewsTable.organizationId, org.id));
  assert.equal(reviews.length, 4);
  const byId = new Map(reviews.map((r) => [r.externalReviewId, r]));

  const r1 = byId.get("r-1");
  assert.equal(r1?.reviewerName, "Alice");
  assert.equal(r1?.rating, 5, "FIVE star rating maps to 5");
  assert.equal(r1?.responseStatus, "PUBLISHED");
  assert.equal(r1?.replyText, "Thanks Alice!");
  assert.equal(r1?.sensitiveReason, null);
  assert.equal(r1?.providerResourceName, "accounts/1/locations/1/reviews/r-1");
  assert.ok(r1?.reviewCreatedAt instanceof Date);

  const r2 = byId.get("r-2");
  assert.equal(r2?.reviewerName, "Google reviewer", "missing reviewer gets a fallback name");
  assert.equal(r2?.isAnonymous, true);
  assert.equal(r2?.rating, 1, "ONE star rating maps to 1");
  assert.equal(r2?.responseStatus, "PENDING");
  assert.match(r2?.sensitiveReason ?? "", /low-rating/i);

  const r3 = byId.get("r-3");
  assert.equal(r3?.responseStatus, "PENDING");
  assert.match(r3?.sensitiveReason ?? "", /sensitive language/i);

  const r4 = byId.get("r-4");
  assert.equal(r4?.sensitiveReason, null);

  assert.ok(
    reviews.every((r) => r.requiresApproval),
    "every imported review must require approval",
  );

  // Connection is marked healthy and the dashboard reflects the import.
  const [conn] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(conn.status, "CONNECTED");
  assert.ok(conn.lastSyncedAt);
  assert.equal(conn.lastError, null);
  assert.equal(dashboard.connection.status, "CONNECTED");
  assert.deepEqual(dashboard.summary, {
    totalReviews: 4,
    needsReply: 3,
    replied: 1,
  });

  // Re-running the sync upserts instead of duplicating.
  installSyncHandler(teamId);
  await syncReviewProvider(org.id);
  const reviewsAfter = await db
    .select()
    .from(managedReviewsTable)
    .where(eq(managedReviewsTable.organizationId, org.id));
  assert.equal(reviewsAfter.length, 4, "second sync must not duplicate reviews");
});

test("an import failure surfaces as a note while previously imported reviews still sync", async () => {
  const org = await createOrg("importnote");
  const teamId = `team-note-${runId}`;
  const connection = await createConnection(org.id, teamId);
  installSyncHandler(teamId, { failImportStart: true });

  const dashboard = await syncReviewProvider(org.id);
  assert.equal(dashboard.summary.totalReviews, 4, "existing reviews are still served");

  const [conn] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(conn.status, "CONNECTED", "a failed import start must not break the connection");
  assert.match(conn.lastError ?? "", /could not be imported/i);
  assert.ok(
    !conn.lastError?.includes("import exploded upstream"),
    "upstream error text must not leak into the owner-facing note",
  );
});

// ---------------------------------------------------------------------------
// startReviewProviderConnection
// ---------------------------------------------------------------------------

test("starting a connection provisions a provider team and returns Google's OAuth link", async () => {
  const org = await createOrg("connect");
  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=abc123";
  let teamCreates = 0;
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith("/organization/") && method === "GET") {
      return { body: { teams: [] } };
    }
    if (path.endsWith("/team/") && method === "POST") {
      teamCreates += 1;
      return { body: { id: "team-created-1" } };
    }
    if (path.endsWith("/social-account/connect") && method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      assert.equal(body.teamId, "team-created-1");
      assert.equal(body.type, "GOOGLE_BUSINESS");
      // Our own app's callback route, not a bundle.social hosted page — the
      // whole point of the custom flow is that their UI is never shown.
      assert.match(String(body.redirectUrl), /^https:\/\/.+\/reviews\?bndleConnect=1$/);
      assert.equal(body.disableAutoLogin, true);
      return { body: { url: authUrl } };
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`);
  };

  const result = await startReviewProviderConnection(org.id);
  assert.equal(result.authUrl, authUrl);
  assert.equal(result.connection.status, "PENDING");
  assert.equal(teamCreates, 1);

  const [connection] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.organizationId, org.id));
  assert.equal(connection.externalProfileId, "team-created-1");
  assert.equal(connection.status, "PENDING");

  // Reconnecting reuses the organization's existing team instead of creating
  // another one (which would orphan the connected accounts).
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith("/organization/") && method === "GET") {
      return {
        body: { teams: [{ id: "team-created-1", name: `ReviewMyStore ${org.id}` }] },
      };
    }
    if (path.endsWith("/team/") && method === "POST") {
      throw new Error("must not create a second team for the same organization");
    }
    if (path.endsWith("/social-account/connect") && method === "POST") {
      return { body: { url: authUrl } };
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`);
  };
  const again = await startReviewProviderConnection(org.id);
  assert.equal(again.authUrl, authUrl);
});

test("starting a connection fails loudly when the provider returns no OAuth link", async () => {
  const org = await createOrg("nolink");
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith("/organization/") && method === "GET") {
      return { body: { teams: [] } };
    }
    if (path.endsWith("/team/") && method === "POST") {
      return { body: { id: "team-nolink-1" } };
    }
    return { body: {} }; // connect endpoint returns no url
  };
  await assert.rejects(
    () => startReviewProviderConnection(org.id),
    (error: unknown) => {
      assert.ok(error instanceof ReviewProviderError);
      assert.match(error.message, /connection link/i);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// getReviewProviderConnectionLocations / selectReviewProviderLocation
// ---------------------------------------------------------------------------

test("checking connection locations reports NOT_CONNECTED when Google OAuth hasn't finished", async () => {
  const org = await createOrg("notconnected");
  const teamId = `team-notconnected-${runId}`;
  await createConnection(org.id, teamId);
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith("/social-account/by-type") && method === "GET") {
      // bundle.social 404s when no matching social account exists yet.
      return { status: 404, body: { message: "not found" } };
    }
    throw new Error(`Unexpected provider request: ${method} ${url.pathname}`);
  };

  const result = await getReviewProviderConnectionLocations(org.id);
  assert.deepEqual(result, { stage: "NOT_CONNECTED", locations: [] });
});

test("checking connection locations reports NEEDS_LOCATION with the available channels", async () => {
  const org = await createOrg("needslocation");
  const teamId = `team-needslocation-${runId}`;
  await createConnection(org.id, teamId);
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith("/social-account/by-type") && method === "GET") {
      assert.equal(url.searchParams.get("type"), "GOOGLE_BUSINESS");
      assert.equal(url.searchParams.get("teamId"), teamId);
      return {
        body: {
          id: "sa-1",
          type: "GOOGLE_BUSINESS",
          externalId: null,
          channels: [
            { id: "ch-1", name: "Downtown", address: "1 Main St" },
            { id: "ch-2", name: "Uptown", address: "9 High St" },
          ],
        },
      };
    }
    throw new Error(`Unexpected provider request: ${method} ${url.pathname}`);
  };

  const result = await getReviewProviderConnectionLocations(org.id);
  assert.equal(result.stage, "NEEDS_LOCATION");
  assert.deepEqual(result.locations, [
    { id: "ch-1", name: "Downtown", address: "1 Main St" },
    { id: "ch-2", name: "Uptown", address: "9 High St" },
  ]);
});

test("checking connection locations reports NO_LOCATIONS_FOUND when the account has no channels", async () => {
  const org = await createOrg("nolocations");
  const teamId = `team-nolocations-${runId}`;
  await createConnection(org.id, teamId);
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith("/social-account/by-type") && method === "GET") {
      return { body: { id: "sa-1", type: "GOOGLE_BUSINESS", externalId: null, channels: [] } };
    }
    throw new Error(`Unexpected provider request: ${method} ${url.pathname}`);
  };

  const result = await getReviewProviderConnectionLocations(org.id);
  assert.deepEqual(result, { stage: "NO_LOCATIONS_FOUND", locations: [] });
});

test("checking connection locations reports READY once a location is already selected", async () => {
  const org = await createOrg("ready");
  const teamId = `team-ready-${runId}`;
  await createConnection(org.id, teamId);
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith("/social-account/by-type") && method === "GET") {
      return {
        body: {
          id: "sa-1",
          type: "GOOGLE_BUSINESS",
          externalId: "ch-1",
          channels: [{ id: "ch-1", name: "Downtown", address: "1 Main St" }],
        },
      };
    }
    throw new Error(`Unexpected provider request: ${method} ${url.pathname}`);
  };

  const result = await getReviewProviderConnectionLocations(org.id);
  assert.deepEqual(result, { stage: "READY", locations: [] });
});

test("selecting a location sets the channel then imports it via the normal sync", async () => {
  const org = await createOrg("selectlocation");
  const teamId = `team-selectlocation-${runId}`;
  await createConnection(org.id, teamId);
  let setChannelCalled = false;
  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith("/social-account/set-channel") && method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      assert.equal(body.type, "GOOGLE_BUSINESS");
      assert.equal(body.teamId, teamId);
      assert.equal(body.channelId, "ch-1");
      setChannelCalled = true;
      return { body: {} };
    }
    if (path.endsWith(`/team/${teamId}`) && method === "GET") {
      return {
        body: {
          socialAccounts: [
            {
              id: "sa-1",
              type: "GOOGLE_BUSINESS",
              displayName: "Downtown Store",
              externalId: "ch-1",
              channels: [{ id: "ch-1", name: "Downtown", address: "1 Main St" }],
            },
          ],
        },
      };
    }
    if (path.endsWith("/misc/google-business/reviews/import") && method === "POST") {
      return { body: {} };
    }
    if (path.endsWith("/misc/google-business/reviews/import") && method === "GET") {
      return { body: { imports: [{ status: "COMPLETED" }] } };
    }
    if (path.endsWith("/misc/google-business/reviews") && method === "GET") {
      return { body: { total: 0, reviews: [] } };
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`);
  };

  const dashboard = await selectReviewProviderLocation(org.id, "ch-1");
  assert.ok(setChannelCalled, "must select the channel before syncing");
  assert.equal(dashboard.connection.status, "CONNECTED");
  assert.equal(dashboard.locations.length, 1);
  assert.equal(dashboard.locations[0].name, "Downtown Store");
});

// ---------------------------------------------------------------------------
// Organization ownership checks
// ---------------------------------------------------------------------------

test("review mutations are scoped to the owning organization", async () => {
  const orgOwner = await createOrg("owner");
  const orgIntruder = await createOrg("intruder");
  const user = await createUser(orgIntruder.id, "intruder");
  const connection = await createConnection(orgOwner.id, `team-own-${runId}`);
  const location = await createLocation(orgOwner.id, connection.id);
  const review = await createReview(orgOwner.id, location.id);

  resetCalls();
  await assert.rejects(
    () => publishManagedReviewReply(orgIntruder.id, user.id, review.id, "Hi!"),
    ManagedReviewNotFoundError,
  );
  await assert.rejects(
    () => deleteManagedReviewReply(orgIntruder.id, user.id, review.id),
    ManagedReviewNotFoundError,
  );
  await assert.rejects(
    () => generateManagedReviewDraft(orgIntruder.id, user.id, review.id),
    ManagedReviewNotFoundError,
  );
  assert.equal(
    recorded.length,
    0,
    "cross-organization attempts must fail before any provider or AI call",
  );

  const intruderList = await listManagedReviews(orgIntruder.id, {});
  assert.deepEqual(intruderList.reviews, []);

  const ownerList = await listManagedReviews(orgOwner.id, {});
  assert.equal(ownerList.reviews.length, 1);
  assert.equal(ownerList.reviews[0].id, review.id);
  assert.equal(ownerList.reviews[0].locationName, location.name);
});

// ---------------------------------------------------------------------------
// Reply publishing: validation, provider failures, idempotent retries
// ---------------------------------------------------------------------------

test("publishing an empty or oversized reply is rejected before any provider call", async () => {
  const org = await createOrg("badreply");
  const user = await createUser(org.id, "badreply");
  const connection = await createConnection(org.id, `team-badreply-${runId}`);
  const location = await createLocation(org.id, connection.id);
  const review = await createReview(org.id, location.id);

  resetCalls();
  for (const comment of ["   ", "x".repeat(4097)]) {
    await assert.rejects(
      () => publishManagedReviewReply(org.id, user.id, review.id, comment),
      (error: unknown) => {
        assert.ok(error instanceof ReviewProviderError);
        assert.equal(error.code, "INVALID_REPLY");
        assert.equal(error.status, 400);
        return true;
      },
    );
  }
  assert.equal(bndleCalls().length, 0);
});

test("a provider failure while publishing leaves the local review untouched", async () => {
  const org = await createOrg("pubfail");
  const user = await createUser(org.id, "pubfail");
  const connection = await createConnection(org.id, `team-pubfail-${runId}`);
  const location = await createLocation(org.id, connection.id);
  const review = await createReview(org.id, location.id, {
    responseStatus: "DRAFT",
    draftReplyText: "Draft to keep",
    draftGeneratedAt: new Date(),
  });

  providerFetch.handler = () => ({ status: 500, body: { error: "boom" } });
  await assert.rejects(
    () => publishManagedReviewReply(org.id, user.id, review.id, "Thanks!"),
    ReviewProviderError,
  );

  const [row] = await db
    .select()
    .from(managedReviewsTable)
    .where(eq(managedReviewsTable.id, review.id));
  assert.equal(row.responseStatus, "DRAFT", "status must not change on failure");
  assert.equal(row.replyText, null);
  assert.equal(row.draftReplyText, "Draft to keep", "draft must survive a failed publish");
});

test("publishing succeeds once and retries of the same reply are idempotent", async () => {
  const org = await createOrg("pubok");
  const user = await createUser(org.id, "pubok");
  const teamId = `team-pubok-${runId}`;
  const connection = await createConnection(org.id, teamId);
  const location = await createLocation(org.id, connection.id);
  const review = await createReview(org.id, location.id, {
    externalReviewId: "ext pub/1", // exercises URL encoding
    draftReplyText: "AI draft",
    draftGeneratedAt: new Date(),
    responseStatus: "DRAFT",
  });

  providerFetch.handler = () => ({ body: {} });
  resetCalls();
  const published = await publishManagedReviewReply(
    org.id,
    user.id,
    review.id,
    "  Thank you for visiting!  ",
  );
  assert.equal(published.review.responseStatus, "PUBLISHED");
  assert.equal(published.review.replyText, "Thank you for visiting!");
  assert.equal(published.review.draftReplyText, null, "draft is consumed on publish");

  const replyCalls = bndleCalls();
  assert.equal(replyCalls.length, 1);
  assert.equal(replyCalls[0].method, "PUT");
  assert.ok(
    replyCalls[0].url.includes(
      `/misc/google-business/reviews/${encodeURIComponent("ext pub/1")}/reply`,
    ),
    `unexpected provider URL: ${replyCalls[0].url}`,
  );
  assert.deepEqual(replyCalls[0].body, {
    teamId,
    comment: "Thank you for visiting!",
  });

  const audits = await db
    .select()
    .from(reviewAuditEventsTable)
    .where(
      and(
        eq(reviewAuditEventsTable.managedReviewId, review.id),
        eq(reviewAuditEventsTable.eventType, "REPLY_PUBLISHED"),
      ),
    );
  assert.equal(audits.length, 1);

  // Retrying the exact same reply must not hit the provider again.
  resetCalls();
  const retried = await publishManagedReviewReply(
    org.id,
    user.id,
    review.id,
    "Thank you for visiting!",
  );
  assert.equal(retried.review.responseStatus, "PUBLISHED");
  assert.equal(bndleCalls().length, 0, "identical retry must skip the provider call");

  // A changed reply overwrites via the provider again.
  resetCalls();
  const changed = await publishManagedReviewReply(
    org.id,
    user.id,
    review.id,
    "Thank you so much for visiting!",
  );
  assert.equal(changed.review.replyText, "Thank you so much for visiting!");
  assert.equal(bndleCalls().length, 1, "an edited reply must be re-sent to the provider");

  // Removing the reply calls the provider once, then a second delete is local-only.
  resetCalls();
  const removed = await deleteManagedReviewReply(org.id, user.id, review.id);
  assert.equal(removed.review.responseStatus, "PENDING");
  assert.equal(removed.review.replyText, null);
  const deleteCalls = bndleCalls();
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].method, "DELETE");

  resetCalls();
  await deleteManagedReviewReply(org.id, user.id, review.id);
  assert.equal(bndleCalls().length, 0, "deleting an absent reply must not call the provider");
});

// ---------------------------------------------------------------------------
// AI drafts stay unpublished and keep the approval requirement
// ---------------------------------------------------------------------------

test("generating an AI draft never publishes and keeps requiresApproval set", async () => {
  const org = await createOrg("draft");
  const user = await createUser(org.id, "draft");
  const connection = await createConnection(org.id, `team-draft-${runId}`);
  const location = await createLocation(org.id, connection.id);
  const review = await createReview(org.id, location.id, {
    rating: 1,
    comment: "Terrible service",
  });

  resetCalls();
  const result = await generateManagedReviewDraft(org.id, user.id, review.id);
  assert.equal(result.review.responseStatus, "DRAFT");
  assert.ok(result.review.draftReplyText, "a draft body is stored");
  assert.equal(result.review.replyText, null, "nothing is published to Google");
  assert.equal(result.review.requiresApproval, true);
  assert.match(result.review.sensitiveReason ?? "", /low-rating/i);

  assert.equal(
    bndleCalls().length,
    0,
    "draft generation must never call the review provider",
  );
  assert.ok(
    recorded.some((call) => call.url.includes("/chat/completions")),
    "the AI draft call must be served by the faked fetch, not the real network",
  );

  const audits = await db
    .select()
    .from(reviewAuditEventsTable)
    .where(
      and(
        eq(reviewAuditEventsTable.managedReviewId, review.id),
        eq(reviewAuditEventsTable.eventType, "DRAFT_GENERATED"),
      ),
    );
  assert.equal(audits.length, 1);
});

// ---------------------------------------------------------------------------
// PENDING dashboard state: connected before a Google account is selected
// (regression coverage for the connect-flow provider rewrite, Zernio ->
// bundle.social -- mirrors the "Connection Pending" vs "Review Inbox"
// states Reviews.tsx renders in the frontend)
// ---------------------------------------------------------------------------

test('a connection with no Google account yet stays PENDING after a sync ("Connection Pending" dashboard state)', async () => {
  const org = await createOrg("pendingnoacct");
  const teamId = `team-pendingnoacct-${runId}`;
  const [connection] = await db
    .insert(providerConnectionsTable)
    .values({
      organizationId: org.id,
      provider: "BNDLE",
      externalProfileId: teamId,
      status: "PENDING",
    })
    .returning();

  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith(`/team/${teamId}`) && method === "GET") {
      return { body: { socialAccounts: [] } };
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`);
  };

  const dashboard = await syncReviewProvider(org.id);
  assert.equal(
    dashboard.connection.status,
    "PENDING",
    "no Google account yet must keep the dashboard on the Connection Pending screen, not flip it to CONNECTED or ERROR",
  );
  assert.equal(dashboard.locations.length, 0);

  const [row] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(row.status, "PENDING");
  assert.equal(row.lastError, null);
});

test("an account that loses its Google connection on the provider side reverts to PENDING, not ERROR", async () => {
  const org = await createOrg("droppedacct");
  const teamId = `team-droppedacct-${runId}`;
  const connection = await createConnection(org.id, teamId); // starts CONNECTED

  providerFetch.handler = (url, init) => {
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname;
    if (path.endsWith(`/team/${teamId}`) && method === "GET") {
      return { body: { socialAccounts: [] } };
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`);
  };

  const dashboard = await syncReviewProvider(org.id);
  assert.equal(
    dashboard.connection.status,
    "PENDING",
    "losing the Google account on the provider side must fall back to the reconnect prompt, not a scary ERROR screen",
  );

  const [row] = await db
    .select()
    .from(providerConnectionsTable)
    .where(eq(providerConnectionsTable.id, connection.id));
  assert.equal(row.status, "PENDING");
});
