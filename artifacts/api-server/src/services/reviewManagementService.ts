import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
} from "drizzle-orm";
import {
  db,
  managedReviewsTable,
  providerConnectionsTable,
  reviewAuditEventsTable,
  reviewLocationsTable,
  type ProviderConnection,
} from "@workspace/db";
import { generateReviewReplyDraft } from "./aiService";
import { logger } from "../lib/logger";

const BNDLE_API_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://zernio.com/api";

type JsonRecord = Record<string, unknown>;

export class ReviewProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code = "REVIEW_PROVIDER_ERROR",
  ) {
    super(message);
    this.name = "ReviewProviderError";
  }
}

export class ManagedReviewNotFoundError extends Error {
  constructor() {
    super("This review is unavailable or no longer belongs to your organization.");
    this.name = "ManagedReviewNotFoundError";
  }
}

function providerApiKey(): string {
  const key = process.env.BNDLE_SOCIAL_API;
  if (!key) {
    throw new ReviewProviderError(
      "Review provider is not configured. Ask an administrator to connect BNDLE.",
      503,
      "REVIEW_PROVIDER_NOT_CONFIGURED",
    );
  }
  return key;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function valueString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function valueNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function valueBoolean(value: unknown): boolean {
  return value === true;
}

function asDate(value: unknown): Date | null {
  const raw = valueString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function url(path: string, query?: Record<string, string | number | undefined>) {
  const target = new URL(`${BNDLE_API_BASE}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  return target;
}

async function bndleRequest<T extends JsonRecord = JsonRecord>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${providerApiKey()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const bodyText = await response.text();
  let payload: JsonRecord = {};
  try {
    payload = asRecord(bodyText ? JSON.parse(bodyText) : {});
  } catch {
    // The upstream response body is not returned or logged; only its status
    // travels across this boundary so provider internals remain private.
  }

  if (!response.ok) {
    logger.warn(
      { providerStatus: response.status, path: path.split("?")[0] },
      "BNDLE review provider request failed",
    );
    const code = valueString(payload.code);
    const disconnected = code === "token_invalid" || response.status === 401;
    throw new ReviewProviderError(
      disconnected
        ? "Your Google Business connection needs to be reconnected."
        : "The review provider could not complete that request. Please try again.",
      disconnected ? 409 : response.status >= 500 ? 502 : 400,
      disconnected ? "REVIEW_PROVIDER_RECONNECT_REQUIRED" : "REVIEW_PROVIDER_ERROR",
    );
  }
  return payload as T;
}

async function getOrCreateProviderProfile(organizationId: string) {
  const profileName = `ReviewMyStore ${organizationId}`;
  const listed = await bndleRequest("v1/profiles");
  const profiles = asArray(listed.profiles ?? listed.data);
  const existing = profiles.find(
    (profile) => valueString(profile.name) === profileName,
  );
  const existingId = existing ? valueString(existing._id ?? existing.id) : null;
  if (existingId) return existingId;

  const created = await bndleRequest("v1/profiles", {
    method: "POST",
    body: JSON.stringify({
      name: profileName,
      description: "Managed by ReviewMyStore review dashboard",
    }),
  });
  const profile = asRecord(created.profile ?? created.data);
  const profileId = valueString(profile._id ?? profile.id);
  if (!profileId) {
    throw new ReviewProviderError(
      "The review provider did not return a profile identifier.",
    );
  }
  return profileId;
}

async function getConnection(
  organizationId: string,
): Promise<ProviderConnection | null> {
  const [connection] = await db
    .select()
    .from(providerConnectionsTable)
    .where(
      and(
        eq(providerConnectionsTable.organizationId, organizationId),
        eq(providerConnectionsTable.provider, "BNDLE"),
      ),
    )
    .limit(1);
  return connection ?? null;
}

async function getRequiredConnection(organizationId: string) {
  const connection = await getConnection(organizationId);
  if (!connection) {
    throw new ReviewProviderError(
      "Connect your Google Business Profile before syncing reviews.",
      409,
      "REVIEW_PROVIDER_NOT_CONNECTED",
    );
  }
  return connection;
}

function connectionResult(connection: ProviderConnection | null) {
  return {
    status: connection?.status ?? "DISCONNECTED",
    provider: "BNDLE" as const,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    lastError: connection?.lastError ?? null,
  };
}

function reviewSensitivity(rating: number, comment: string): string | null {
  if (rating <= 2) return "Low-rating review — approval required";
  const sensitive = /\b(lawyer|legal|lawsuit|sue|refund|chargeback|police|threat|harass|discriminat|injur|fraud|scam)\b/i;
  return sensitive.test(comment)
    ? "Sensitive language detected — approval required"
    : null;
}

async function recordAudit(
  organizationId: string,
  managedReviewId: string,
  actorUserId: string | null,
  eventType: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(reviewAuditEventsTable).values({
    organizationId,
    managedReviewId,
    actorUserId,
    eventType,
    metadata,
  });
}

function toLocationPayload(row: typeof reviewLocationsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    category: row.category,
    websiteUrl: row.websiteUrl,
    isSelected: row.isSelected,
  };
}

function toReviewPayload(
  review: typeof managedReviewsTable.$inferSelect,
  locationName: string,
) {
  return {
    id: review.id,
    locationId: review.reviewLocationId,
    locationName,
    reviewerName: review.reviewerName,
    reviewerPhotoUrl: review.reviewerPhotoUrl,
    isAnonymous: review.isAnonymous,
    rating: review.rating,
    comment: review.comment,
    reviewCreatedAt: review.reviewCreatedAt,
    reviewUpdatedAt: review.reviewUpdatedAt,
    replyText: review.replyText,
    replyUpdatedAt: review.replyUpdatedAt,
    draftReplyText: review.draftReplyText,
    draftGeneratedAt: review.draftGeneratedAt,
    requiresApproval: review.requiresApproval,
    sensitiveReason: review.sensitiveReason,
    responseStatus: review.responseStatus,
  };
}

export async function startReviewProviderConnection(organizationId: string) {
  const externalProfileId = await getOrCreateProviderProfile(organizationId);
  const [connection] = await db
    .insert(providerConnectionsTable)
    .values({
      organizationId,
      provider: "BNDLE",
      externalProfileId,
      status: "PENDING",
      lastError: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        providerConnectionsTable.organizationId,
        providerConnectionsTable.provider,
      ],
      set: {
        externalProfileId,
        status: "PENDING",
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  // BNDLE requires the profile id in the query string; the server creates the
  // scoped authorization URL so it is never guessed client-side.
  const scopedResult = await bndleRequest(
    `v1/connect/googlebusiness?profileId=${encodeURIComponent(externalProfileId)}`,
  );
  const authUrl = valueString(scopedResult.authUrl);
  if (!authUrl) {
    throw new ReviewProviderError(
      "The review provider did not return an authorization URL.",
    );
  }
  return { connection: connectionResult(connection), authUrl };
}

async function upsertLocation(
  organizationId: string,
  connectionId: string,
  accountId: string,
  location: JsonRecord,
  selectedLocationId: string | null,
) {
  const externalLocationId = valueString(location.id);
  const name = valueString(location.name);
  if (!externalLocationId || !name) return null;

  const [saved] = await db
    .insert(reviewLocationsTable)
    .values({
      organizationId,
      providerConnectionId: connectionId,
      externalAccountId: accountId,
      externalLocationId,
      name,
      address: valueString(location.address),
      category: valueString(location.category),
      websiteUrl: valueString(location.websiteUrl),
      isSelected: externalLocationId === selectedLocationId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        reviewLocationsTable.providerConnectionId,
        reviewLocationsTable.externalLocationId,
      ],
      set: {
        externalAccountId: accountId,
        name,
        address: valueString(location.address),
        category: valueString(location.category),
        websiteUrl: valueString(location.websiteUrl),
        isSelected: externalLocationId === selectedLocationId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

async function syncReviewsForLocation(
  organizationId: string,
  location: typeof reviewLocationsTable.$inferSelect,
) {
  const payload = await bndleRequest(
    `v1/accounts/${encodeURIComponent(location.externalAccountId)}/gmb-reviews`,
  );
  const reviews = asArray(payload.reviews);
  for (const rawReview of reviews) {
    const externalReviewId = valueString(rawReview.id);
    if (!externalReviewId) continue;
    const reviewer = asRecord(rawReview.reviewer);
    const rating = valueNumber(rawReview.rating) ?? 0;
    const comment = valueString(rawReview.comment) ?? "";
    const reply = asRecord(rawReview.reviewReply);
    const replyText = valueString(reply.comment);
    const sensitiveReason = reviewSensitivity(rating, comment);
    await db
      .insert(managedReviewsTable)
      .values({
        organizationId,
        reviewLocationId: location.id,
        externalReviewId,
        providerResourceName: valueString(rawReview.name),
        reviewerName: valueString(reviewer.displayName) ?? "Google reviewer",
        reviewerPhotoUrl: valueString(reviewer.profilePhotoUrl),
        isAnonymous: valueBoolean(reviewer.isAnonymous),
        rating,
        comment,
        reviewCreatedAt: asDate(rawReview.createTime),
        reviewUpdatedAt: asDate(rawReview.updateTime),
        replyText,
        replyUpdatedAt: asDate(reply.updateTime),
        responseStatus: replyText ? "PUBLISHED" : "PENDING",
        requiresApproval: true,
        sensitiveReason,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          managedReviewsTable.reviewLocationId,
          managedReviewsTable.externalReviewId,
        ],
        set: {
          providerResourceName: valueString(rawReview.name),
          reviewerName: valueString(reviewer.displayName) ?? "Google reviewer",
          reviewerPhotoUrl: valueString(reviewer.profilePhotoUrl),
          isAnonymous: valueBoolean(reviewer.isAnonymous),
          rating,
          comment,
          reviewCreatedAt: asDate(rawReview.createTime),
          reviewUpdatedAt: asDate(rawReview.updateTime),
          replyText,
          replyUpdatedAt: asDate(reply.updateTime),
          responseStatus: replyText ? "PUBLISHED" : "PENDING",
          requiresApproval: true,
          sensitiveReason,
          updatedAt: new Date(),
        },
      });
  }
}

export async function syncReviewProvider(organizationId: string) {
  const connection = await getRequiredConnection(organizationId);
  const accountsPayload = await bndleRequest(
    `v1/accounts?profileId=${encodeURIComponent(connection.externalProfileId)}`,
  );
  const googleAccounts = asArray(accountsPayload.accounts ?? accountsPayload.data)
    .filter((account) => {
      const platform = valueString(account.platform)?.toLowerCase() ?? "";
      return platform === "googlebusiness" || platform === "google_business";
    });

  if (googleAccounts.length === 0) {
    await db
      .update(providerConnectionsTable)
      .set({ status: "PENDING", lastError: null, updatedAt: new Date() })
      .where(eq(providerConnectionsTable.id, connection.id));
    return getReviewDashboard(organizationId);
  }

  try {
    for (const account of googleAccounts) {
      const accountId = valueString(account._id ?? account.id);
      if (!accountId) continue;
      const locationPayload = await bndleRequest(
        `v1/accounts/${encodeURIComponent(accountId)}/gmb-locations?limit=500`,
      );
      const selectedLocationId = valueString(locationPayload.selectedLocationId);
      const locations = asArray(locationPayload.locations);
      const savedLocations = [];
      for (const rawLocation of locations) {
        const saved = await upsertLocation(
          organizationId,
          connection.id,
          accountId,
          rawLocation,
          selectedLocationId,
        );
        if (saved) savedLocations.push(saved);
      }

      // BNDLE's Google review endpoint uses the active GBP location. Walk each
      // location to import all reviews, then restore the owner's original
      // provider-side selection so syncing does not alter their working view.
      for (const location of savedLocations) {
        await bndleRequest(
          `v1/accounts/${encodeURIComponent(accountId)}/gmb-locations`,
          {
            method: "PUT",
            body: JSON.stringify({ locationId: location.externalLocationId }),
          },
        );
        await syncReviewsForLocation(organizationId, location);
      }
      if (selectedLocationId) {
        await bndleRequest(
          `v1/accounts/${encodeURIComponent(accountId)}/gmb-locations`,
          {
            method: "PUT",
            body: JSON.stringify({ locationId: selectedLocationId }),
          },
        );
      }
    }

    await db
      .update(providerConnectionsTable)
      .set({
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(providerConnectionsTable.id, connection.id));
  } catch (error) {
    const message =
      error instanceof ReviewProviderError
        ? error.message
        : "Review synchronization failed. Please try again.";
    await db
      .update(providerConnectionsTable)
      .set({ status: "ERROR", lastError: message, updatedAt: new Date() })
      .where(eq(providerConnectionsTable.id, connection.id));
    throw error;
  }

  return getReviewDashboard(organizationId);
}

export async function getReviewDashboard(organizationId: string) {
  const connection = await getConnection(organizationId);
  const locations = await db
    .select()
    .from(reviewLocationsTable)
    .where(eq(reviewLocationsTable.organizationId, organizationId))
    .orderBy(desc(reviewLocationsTable.isSelected), reviewLocationsTable.name);
  const [counts] = await db
    .select({
      total: count(),
    })
    .from(managedReviewsTable)
    .where(eq(managedReviewsTable.organizationId, organizationId));
  const [needsReply] = await db
    .select({ total: count() })
    .from(managedReviewsTable)
    .where(
      and(
        eq(managedReviewsTable.organizationId, organizationId),
        eq(managedReviewsTable.responseStatus, "PENDING"),
      ),
    );
  const [published] = await db
    .select({ total: count() })
    .from(managedReviewsTable)
    .where(
      and(
        eq(managedReviewsTable.organizationId, organizationId),
        eq(managedReviewsTable.responseStatus, "PUBLISHED"),
      ),
    );
  return {
    connection: connectionResult(connection),
    locations: locations.map(toLocationPayload),
    summary: {
      totalReviews: counts?.total ?? 0,
      needsReply: needsReply?.total ?? 0,
      replied: published?.total ?? 0,
    },
  };
}

export async function listManagedReviews(
  organizationId: string,
  filters: {
    locationId?: string;
    rating?: number;
    responseStatus?: "PENDING" | "DRAFT" | "PUBLISHED";
    search?: string;
  },
) {
  const conditions = [eq(managedReviewsTable.organizationId, organizationId)];
  if (filters.locationId) {
    conditions.push(eq(managedReviewsTable.reviewLocationId, filters.locationId));
  }
  if (filters.rating) conditions.push(eq(managedReviewsTable.rating, filters.rating));
  if (filters.responseStatus) {
    conditions.push(
      eq(managedReviewsTable.responseStatus, filters.responseStatus),
    );
  }
  if (filters.search?.trim()) {
    const pattern = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(managedReviewsTable.reviewerName, pattern),
        ilike(managedReviewsTable.comment, pattern),
      )!,
    );
  }
  const rows = await db
    .select({ review: managedReviewsTable, locationName: reviewLocationsTable.name })
    .from(managedReviewsTable)
    .innerJoin(
      reviewLocationsTable,
      eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
    )
    .where(and(...conditions))
    .orderBy(desc(managedReviewsTable.reviewUpdatedAt), desc(managedReviewsTable.createdAt));
  return {
    reviews: rows.map(({ review, locationName }) =>
      toReviewPayload(review, locationName),
    ),
  };
}

async function findReview(organizationId: string, managedReviewId: string) {
  const [row] = await db
    .select({
      review: managedReviewsTable,
      location: reviewLocationsTable,
    })
    .from(managedReviewsTable)
    .innerJoin(
      reviewLocationsTable,
      eq(managedReviewsTable.reviewLocationId, reviewLocationsTable.id),
    )
    .where(
      and(
        eq(managedReviewsTable.id, managedReviewId),
        eq(managedReviewsTable.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!row) throw new ManagedReviewNotFoundError();
  return row;
}

export async function generateManagedReviewDraft(
  organizationId: string,
  actorUserId: string,
  managedReviewId: string,
) {
  const { review, location } = await findReview(organizationId, managedReviewId);
  const draftReplyText = await generateReviewReplyDraft({
    businessName: location.name,
    reviewerName: review.reviewerName,
    rating: review.rating,
    reviewText: review.comment,
    organizationId,
  });
  const sensitiveReason = reviewSensitivity(review.rating, review.comment);
  const [updated] = await db
    .update(managedReviewsTable)
    .set({
      draftReplyText,
      draftGeneratedAt: new Date(),
      responseStatus: "DRAFT",
      requiresApproval: true,
      sensitiveReason,
      updatedAt: new Date(),
    })
    .where(eq(managedReviewsTable.id, review.id))
    .returning();
  await recordAudit(organizationId, review.id, actorUserId, "DRAFT_GENERATED", {
    rating: review.rating,
    requiresApproval: true,
  });
  return { review: toReviewPayload(updated, location.name) };
}

export async function publishManagedReviewReply(
  organizationId: string,
  actorUserId: string,
  managedReviewId: string,
  comment: string,
) {
  const { review, location } = await findReview(organizationId, managedReviewId);
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new ReviewProviderError("A reply cannot be empty.", 400, "INVALID_REPLY");
  }

  // Provider updates are PUT-like. This local check handles common client
  // retries without a network call; a retry after an interrupted server
  // response is still safe because BNDLE overwrites the same review reply.
  if (review.responseStatus !== "PUBLISHED" || review.replyText !== trimmed) {
    await bndleRequest(
      `v1/accounts/${encodeURIComponent(location.externalAccountId)}/gmb-reviews/${encodeURIComponent(review.externalReviewId)}/reply`,
      { method: "POST", body: JSON.stringify({ comment: trimmed }) },
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(managedReviewsTable)
    .set({
      replyText: trimmed,
      replyUpdatedAt: now,
      draftReplyText: null,
      draftGeneratedAt: null,
      responseStatus: "PUBLISHED",
      requiresApproval: true,
      updatedAt: now,
    })
    .where(eq(managedReviewsTable.id, review.id))
    .returning();
  await recordAudit(organizationId, review.id, actorUserId, "REPLY_PUBLISHED", {
    provider: "BNDLE",
    rating: review.rating,
  });
  return { review: toReviewPayload(updated, location.name) };
}

export async function deleteManagedReviewReply(
  organizationId: string,
  actorUserId: string,
  managedReviewId: string,
) {
  const { review, location } = await findReview(organizationId, managedReviewId);
  if (review.replyText) {
    await bndleRequest(
      `v1/accounts/${encodeURIComponent(location.externalAccountId)}/gmb-reviews/${encodeURIComponent(review.externalReviewId)}/reply`,
      { method: "DELETE" },
    );
  }
  const [updated] = await db
    .update(managedReviewsTable)
    .set({
      replyText: null,
      replyUpdatedAt: null,
      responseStatus: "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(managedReviewsTable.id, review.id))
    .returning();
  await recordAudit(organizationId, review.id, actorUserId, "REPLY_DELETED", {
    provider: "BNDLE",
  });
  return { review: toReviewPayload(updated, location.name) };
}