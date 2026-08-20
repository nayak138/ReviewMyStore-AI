import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
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

// bundle.social REST API. All endpoints live under /api/v1 and authenticate
// with the org-level x-api-key header. Docs: https://info.bundle.social
const BNDLE_API_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://api.bundle.social";

const IMPORT_POLL_INTERVAL_MS = 2_000;
const IMPORT_POLL_TIMEOUT_MS = 30_000;
const IMPORT_BATCH_COUNT = 50;
const REVIEW_PAGE_SIZE = 100;
const MAX_SYNCED_REVIEWS = 1_000;

type JsonRecord = Record<string, unknown>;

export class ReviewProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code = "REVIEW_PROVIDER_ERROR",
    /** Raw HTTP status from bundle.social, for internal flow decisions only. */
    readonly upstreamStatus: number | null = null,
    /**
     * bundle.social's own error message (e.g. quota text), kept internal —
     * used to drive retry logic, never shown to end users verbatim.
     */
    readonly providerMessage: string | null = null,
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
      "Review provider is not configured. Ask an administrator to add the bundle.social API key.",
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

function asDate(value: unknown): Date | null {
  const raw = valueString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const STAR_RATINGS: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function starRatingToNumber(value: unknown): number {
  const raw = valueString(value);
  return (raw && STAR_RATINGS[raw.toUpperCase()]) || 0;
}

function url(path: string, query?: Record<string, string | number | undefined>) {
  const target = new URL(`${BNDLE_API_BASE}/api/v1/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) target.searchParams.set(key, String(value));
  }
  return target;
}

async function bndleRequest<T extends JsonRecord = JsonRecord>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await fetch(url(path, query), {
    ...init,
    headers: {
      "x-api-key": providerApiKey(),
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
      "bundle.social review provider request failed",
    );
    // 401 = key missing, 403 = key invalid. Either way this is OUR platform
    // credential, never the end user's Google connection.
    if (response.status === 401 || response.status === 403) {
      throw new ReviewProviderError(
        "The review provider API key is invalid or expired. Ask an administrator to update the bundle.social credential.",
        503,
        "REVIEW_PROVIDER_NOT_CONFIGURED",
        response.status,
      );
    }
    if (response.status === 429) {
      throw new ReviewProviderError(
        "The review provider is rate limiting requests. Please try again in a minute.",
        429,
        "REVIEW_PROVIDER_RATE_LIMITED",
        response.status,
      );
    }
    throw new ReviewProviderError(
      "The review provider could not complete that request. Please try again.",
      response.status >= 500 ? 502 : 400,
      "REVIEW_PROVIDER_ERROR",
      response.status,
      valueString(payload.message),
    );
  }
  return payload as T;
}

/**
 * bundle.social scopes social accounts to teams; we keep one team per
 * organization so tenants never see each other's accounts or reviews.
 */
async function getOrCreateProviderTeam(organizationId: string): Promise<string> {
  const teamName = `ReviewMyStore ${organizationId}`;
  const organization = await bndleRequest("organization/");
  const teams = asArray(organization.teams);
  const existing = teams.find((team) => valueString(team.name) === teamName);
  const existingId = existing ? valueString(existing.id) : null;
  if (existingId) return existingId;

  const created = await bndleRequest("team/", {
    method: "POST",
    body: JSON.stringify({ name: teamName }),
  });
  const teamId = valueString(created.id);
  if (!teamId) {
    throw new ReviewProviderError(
      "The review provider did not return a team identifier.",
    );
  }
  return teamId;
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
    remainingImportCapacity: connection?.remainingImportCapacity ?? null,
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

export async function startReviewProviderConnection(
  organizationId: string,
  returnUrl?: string,
) {
  const teamId = await getOrCreateProviderTeam(organizationId);
  const [connection] = await db
    .insert(providerConnectionsTable)
    .values({
      organizationId,
      provider: "BNDLE",
      externalProfileId: teamId,
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
        externalProfileId: teamId,
        status: "PENDING",
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  // The hosted portal handles Google OAuth AND business-location selection;
  // the API key stays server-side and the link expires after an hour.
  const portal = await bndleRequest("social-account/create-portal-link", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      socialAccountTypes: ["GOOGLE_BUSINESS"],
      ...(returnUrl ? { redirectUrl: returnUrl } : {}),
      expiresIn: 60,
    }),
  });
  const authUrl = valueString(portal.url);
  if (!authUrl) {
    throw new ReviewProviderError(
      "The review provider did not return a connection link.",
    );
  }
  return { connection: connectionResult(connection), authUrl };
}

/**
 * Each connected GOOGLE_BUSINESS social account represents one selected
 * business location (bundle.social requires picking a location during the
 * hosted flow). We mirror that account as a review location row.
 */
async function upsertLocationFromAccount(
  organizationId: string,
  connectionId: string,
  account: JsonRecord,
) {
  const socialAccountId = valueString(account.id);
  if (!socialAccountId) return null;
  const channels = asArray(account.channels);
  const selectedExternalId = valueString(account.externalId);
  const selectedChannel = channels.find(
    (channel) => valueString(channel.id) === selectedExternalId,
  );
  const name =
    valueString(account.displayName) ??
    valueString(account.username) ??
    valueString(selectedChannel?.name) ??
    "Google Business location";

  const [saved] = await db
    .insert(reviewLocationsTable)
    .values({
      organizationId,
      providerConnectionId: connectionId,
      externalAccountId: socialAccountId,
      externalLocationId: selectedExternalId ?? socialAccountId,
      name,
      address: valueString(selectedChannel?.address),
      category: null,
      websiteUrl: null,
      isSelected: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        reviewLocationsTable.providerConnectionId,
        reviewLocationsTable.externalLocationId,
      ],
      set: {
        externalAccountId: socialAccountId,
        name,
        address: valueString(selectedChannel?.address),
        isSelected: true,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

/**
 * Review imports are async jobs on bundle.social. Starting one when another
 * is already running returns 409, which simply means "in progress".
 * Returns an error note when the import could not start for other reasons
 * (e.g. the monthly import quota is exhausted) so the sync can still surface
 * already-imported reviews instead of failing outright.
 */
async function requestImport(teamId: string, count: number): Promise<void> {
  await bndleRequest("misc/google-business/reviews/import", {
    method: "POST",
    body: JSON.stringify({ teamId, count }),
  });
}

/**
 * bundle.social rejects the whole import (400) if the requested count
 * exceeds the account's remaining monthly quota — it never clamps for you.
 * Its error text is either "Requested N reviews but only M remaining ...
 * Used: X/Y." (partial quota left) or "... has reached its monthly review
 * import limit of N reviews. Used: N/N ..." (quota fully exhausted). A fixed
 * batch size would silently import zero reviews once quota is below that
 * batch size, so parse the actual remaining count and retry with it.
 */
function parseRemainingQuota(message: string | null): number | null {
  if (!message) return null;
  const partial = message.match(/only (\d+) remaining/i);
  if (partial) return Number(partial[1]);
  if (/reached its monthly review import limit/i.test(message)) return 0;
  return null;
}

async function startReviewImport(teamId: string): Promise<string | null> {
  try {
    await requestImport(teamId, IMPORT_BATCH_COUNT);
    return null;
  } catch (error) {
    if (error instanceof ReviewProviderError) {
      if (error.upstreamStatus === 409) return null; // already running
      if (error.code === "REVIEW_PROVIDER_NOT_CONFIGURED") throw error;

      if (error.upstreamStatus === 400) {
        const remaining = parseRemainingQuota(error.providerMessage);
        if (remaining && remaining > 0) {
          try {
            await requestImport(teamId, remaining);
            return null;
          } catch (retryError) {
            if (
              retryError instanceof ReviewProviderError &&
              retryError.upstreamStatus === 409
            ) {
              return null; // already running
            }
            logger.warn(
              { remaining },
              "Review import retry at clamped quota also failed",
            );
          }
        } else if (remaining === 0) {
          return "You've used all of this month's review imports. Previously imported reviews are still shown — upgrade on bundle.social or wait for next month to import more.";
        }
      }

      logger.warn(
        { upstreamStatus: error.upstreamStatus },
        "Review import could not start; serving previously imported reviews",
      );
      return "New reviews could not be imported right now (import limit or provider issue). Showing previously imported reviews.";
    }
    throw error;
  }
}

/** Polls the async import and returns a user-facing note when the import did
 * not finish cleanly, so the sync can surface partial results honestly. */
async function waitForReviewImport(teamId: string): Promise<string | null> {
  const deadline = Date.now() + IMPORT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const payload = await bndleRequest(
      "misc/google-business/reviews/import",
      {},
      { teamId },
    );
    const [latest] = asArray(payload.imports);
    const status = latest ? valueString(latest.status) : null;
    if (!status || status === "COMPLETED") return null;
    if (status === "FAILED") {
      return "The latest review import failed at the provider. Showing previously imported reviews — try syncing again later.";
    }
    // RATE_LIMITED imports auto-resume on the provider side.
    if (status === "RATE_LIMITED") {
      return "Google is rate limiting review imports; the import will resume automatically. Showing reviews imported so far.";
    }
    await new Promise((resolve) => setTimeout(resolve, IMPORT_POLL_INTERVAL_MS));
  }
  return "The review import is still running. Sync again in a minute to pick up the newest reviews.";
}

async function fetchAllReviews(
  teamId: string,
): Promise<{ reviews: JsonRecord[]; remainingCapacity: number | null }> {
  const reviews: JsonRecord[] = [];
  let remainingCapacity: number | null = null;
  let offset = 0;
  for (;;) {
    const payload = await bndleRequest(
      "misc/google-business/reviews",
      {},
      { teamId, limit: REVIEW_PAGE_SIZE, offset },
    );
    const page = asArray(payload.reviews);
    reviews.push(...page);
    // Reflects the account's remaining monthly import quota as of this
    // request; every page carries the same (current) value.
    remainingCapacity = valueNumber(payload.remainingCapacity);
    const total = valueNumber(payload.total) ?? reviews.length;
    offset += page.length;
    if (page.length === 0 || offset >= total || offset >= MAX_SYNCED_REVIEWS) {
      return { reviews, remainingCapacity };
    }
  }
}

async function upsertManagedReview(
  organizationId: string,
  locationId: string,
  raw: JsonRecord,
) {
  const externalReviewId = valueString(raw.id);
  if (!externalReviewId) return;
  const reviewerName = valueString(raw.reviewerDisplayName);
  const rating = starRatingToNumber(raw.starRating);
  const comment = valueString(raw.comment) ?? "";
  const replyText = valueString(raw.reviewReplyComment);
  const sensitiveReason = reviewSensitivity(rating, comment);
  const values = {
    providerResourceName: valueString(raw.externalReviewId),
    reviewerName: reviewerName ?? "Google reviewer",
    reviewerPhotoUrl: valueString(raw.reviewerProfilePhotoUrl),
    isAnonymous: !reviewerName,
    rating,
    comment,
    reviewCreatedAt: asDate(raw.createTime),
    reviewUpdatedAt: asDate(raw.updateTime),
    replyText,
    replyUpdatedAt: asDate(raw.reviewReplyUpdatedAt),
    requiresApproval: true,
    sensitiveReason,
    updatedAt: new Date(),
  };
  await db
    .insert(managedReviewsTable)
    .values({
      organizationId,
      reviewLocationId: locationId,
      externalReviewId,
      responseStatus: replyText ? "PUBLISHED" : "PENDING",
      ...values,
    })
    .onConflictDoUpdate({
      target: [
        managedReviewsTable.reviewLocationId,
        managedReviewsTable.externalReviewId,
      ],
      set: {
        ...values,
        // Keep locally drafted replies intact when the provider has no
        // published reply yet; otherwise reflect the provider state.
        responseStatus: replyText
          ? sql`'PUBLISHED'::review_response_status`
          : sql`CASE WHEN ${managedReviewsTable.responseStatus} = 'DRAFT' THEN 'DRAFT'::review_response_status ELSE 'PENDING'::review_response_status END`,
      },
    });
}

export async function syncReviewProvider(organizationId: string) {
  const connection = await getRequiredConnection(organizationId);
  const teamId = connection.externalProfileId;

  try {
    const team = await bndleRequest(`team/${encodeURIComponent(teamId)}`);
    const googleAccounts = asArray(team.socialAccounts).filter(
      (account) => valueString(account.type) === "GOOGLE_BUSINESS",
    );

    if (googleAccounts.length === 0) {
      await db
        .update(providerConnectionsTable)
        .set({ status: "PENDING", lastError: null, updatedAt: new Date() })
        .where(eq(providerConnectionsTable.id, connection.id));
      return getReviewDashboard(organizationId);
    }

    const locationsByAccountId = new Map<
      string,
      typeof reviewLocationsTable.$inferSelect
    >();
    for (const account of googleAccounts) {
      const saved = await upsertLocationFromAccount(
        organizationId,
        connection.id,
        account,
      );
      if (saved) locationsByAccountId.set(saved.externalAccountId, saved);
    }

    const importNote =
      (await startReviewImport(teamId)) ?? (await waitForReviewImport(teamId));

    const { reviews: rawReviews, remainingCapacity } =
      await fetchAllReviews(teamId);
    for (const raw of rawReviews) {
      const socialAccountId = valueString(raw.socialAccountId);
      const location = socialAccountId
        ? locationsByAccountId.get(socialAccountId)
        : undefined;
      if (!location) continue;
      await upsertManagedReview(organizationId, location.id, raw);
    }

    await db
      .update(providerConnectionsTable)
      .set({
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastError: importNote,
        remainingImportCapacity: remainingCapacity,
        updatedAt: new Date(),
      })
      .where(eq(providerConnectionsTable.id, connection.id));
  } catch (error) {
    if (
      error instanceof ReviewProviderError &&
      error.code === "REVIEW_PROVIDER_NOT_CONFIGURED"
    ) {
      // A missing server-side API key is a deployment problem, not a broken
      // provider connection — leave the owner's connection status untouched.
      throw error;
    }
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
  const connection = await getRequiredConnection(organizationId);
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new ReviewProviderError("A reply cannot be empty.", 400, "INVALID_REPLY");
  }
  if (trimmed.length > 4096) {
    throw new ReviewProviderError(
      "Replies must be 4096 characters or fewer.",
      400,
      "INVALID_REPLY",
    );
  }

  // Provider updates are PUT semantics: replaying the same reply after an
  // interrupted response is safe because bundle.social overwrites it.
  if (review.responseStatus !== "PUBLISHED" || review.replyText !== trimmed) {
    await bndleRequest(
      `misc/google-business/reviews/${encodeURIComponent(review.externalReviewId)}/reply`,
      {
        method: "PUT",
        body: JSON.stringify({
          teamId: connection.externalProfileId,
          comment: trimmed,
        }),
      },
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
    const connection = await getRequiredConnection(organizationId);
    await bndleRequest(
      `misc/google-business/reviews/${encodeURIComponent(review.externalReviewId)}/reply`,
      {
        method: "DELETE",
        body: JSON.stringify({ teamId: connection.externalProfileId }),
      },
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
