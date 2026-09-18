import { and, eq } from "drizzle-orm";
import {
  businessesTable,
  db,
  providerConnectionsTable,
  socialMediaAccountsTable,
} from "@workspace/db";
import {
  bndleRequest,
  getOrCreateProviderTeam,
  ReviewProviderError,
} from "./reviewManagementService";

type JsonRecord = Record<string, unknown>;
type Platform = "FACEBOOK" | "INSTAGRAM" | "THREADS";
const PLATFORMS: readonly Platform[] = ["FACEBOOK", "INSTAGRAM", "THREADS"];

export class SocialMediaNotFoundError extends Error {
  constructor(message = "The requested social media resource was not found.") {
    super(message);
    this.name = "SocialMediaNotFoundError";
  }
}

export class SocialMediaBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialMediaBadRequestError";
  }
}

export class SocialMediaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialMediaConflictError";
  }
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
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function valueDate(value: unknown): Date | null {
  const raw = valueString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function providerPlatform(value: unknown): Platform | null {
  const platform = valueString(value)?.toUpperCase();
  return PLATFORMS.includes(platform as Platform) ? (platform as Platform) : null;
}

function getAppOrigin(): string | null {
  const domain =
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ||
    process.env.REPLIT_DEV_DOMAIN?.trim();
  return domain ? `https://${domain}` : null;
}

function toAccountPayload(row: typeof socialMediaAccountsTable.$inferSelect) {
  return {
    id: row.id,
    businessId: row.businessId,
    platform: row.platform,
    externalAccountId: row.externalAccountId,
    displayName: row.displayName,
    username: row.username,
    profileUrl: row.profileUrl,
    status: row.status,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function providerAccountPayload(account: JsonRecord, connected: boolean) {
  const platform = providerPlatform(account.type);
  if (!platform) return null;
  const externalAccountId =
    valueString(account.id) ?? valueString(account.externalId);
  if (!externalAccountId) return null;
  return {
    externalAccountId,
    platform,
    displayName:
      valueString(account.displayName) ??
      valueString(account.name) ??
      valueString(account.username) ??
      `${platform[0]}${platform.slice(1).toLowerCase()} account`,
    username: valueString(account.username),
    profileUrl:
      valueString(account.profileUrl) ?? valueString(account.url),
    connected,
  };
}

async function getBusiness(organizationId: string, businessId: string) {
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.organizationId, organizationId),
        eq(businessesTable.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!business) throw new SocialMediaNotFoundError("Business not found.");
  return business;
}

async function getTeamId(organizationId: string): Promise<string> {
  const [connection] = await db
    .select({ externalProfileId: providerConnectionsTable.externalProfileId })
    .from(providerConnectionsTable)
    .where(
      and(
        eq(providerConnectionsTable.organizationId, organizationId),
        eq(providerConnectionsTable.provider, "BNDLE"),
      ),
    )
    .limit(1);
  return connection?.externalProfileId ?? getOrCreateProviderTeam(organizationId);
}

async function getProviderAccounts(teamId: string): Promise<JsonRecord[]> {
  const team = await bndleRequest(`team/${encodeURIComponent(teamId)}`);
  return asArray(team.socialAccounts).filter((account) =>
    providerPlatform(account.type),
  );
}

export async function getSocialMediaDashboard(
  organizationId: string,
  businessId: string,
) {
  await getBusiness(organizationId, businessId);
  const [teamId, localAccounts] = await Promise.all([
    getTeamId(organizationId),
    db
      .select()
      .from(socialMediaAccountsTable)
      .where(
        and(
          eq(socialMediaAccountsTable.organizationId, organizationId),
          eq(socialMediaAccountsTable.businessId, businessId),
        ),
      ),
  ]);
  const providerAccounts = await getProviderAccounts(teamId);
  const connectedIds = new Set(
    localAccounts.map((account) => `${account.platform}:${account.externalAccountId}`),
  );
  const availableAccounts = providerAccounts
    .map((account) =>
      providerAccountPayload(
        account,
        connectedIds.has(
          `${providerPlatform(account.type)}:${valueString(account.id) ?? valueString(account.externalId)}`,
        ),
      ),
    )
    .filter((account): account is NonNullable<typeof account> => Boolean(account));

  return {
    teamId,
    accounts: localAccounts.map(toAccountPayload),
    availableAccounts,
  };
}

export async function startSocialMediaConnection(
  organizationId: string,
  businessId: string,
  platform: Platform,
) {
  await getBusiness(organizationId, businessId);
  const appOrigin = getAppOrigin();
  if (!appOrigin) {
    throw new SocialMediaBadRequestError(
      "Could not determine this app's URL to complete the connection.",
    );
  }
  const teamId = await getTeamId(organizationId);
  const result = await bndleRequest("social-account/connect", {
    method: "POST",
    body: JSON.stringify({
      type: platform,
      teamId,
      redirectUrl: `${appOrigin}/social-media?businessId=${encodeURIComponent(businessId)}&socialConnect=1`,
      disableAutoLogin: true,
    }),
  });
  const authUrl = valueString(result.url);
  if (!authUrl) {
    throw new SocialMediaBadRequestError(
      "The social provider did not return a connection link.",
    );
  }
  return { authUrl, platform };
}

export async function attachSocialMediaAccount(
  organizationId: string,
  businessId: string,
  externalAccountId: string,
) {
  await getBusiness(organizationId, businessId);
  const teamId = await getTeamId(organizationId);
  const account = (await getProviderAccounts(teamId)).find(
    (candidate) =>
      valueString(candidate.id) === externalAccountId ||
      valueString(candidate.externalId) === externalAccountId,
  );
  const payload = account ? providerAccountPayload(account, true) : null;
  if (!payload) {
    throw new SocialMediaNotFoundError(
      "That connected social account is no longer available.",
    );
  }

  const [alreadyAssigned] = await db
    .select({ businessId: socialMediaAccountsTable.businessId })
    .from(socialMediaAccountsTable)
    .where(
      and(
        eq(socialMediaAccountsTable.organizationId, organizationId),
        eq(socialMediaAccountsTable.platform, payload.platform),
        eq(socialMediaAccountsTable.externalAccountId, payload.externalAccountId),
      ),
    )
    .limit(1);
  if (alreadyAssigned && alreadyAssigned.businessId !== businessId) {
    throw new SocialMediaConflictError(
      "That social account is already attached to another business.",
    );
  }

  const [saved] = await db
    .insert(socialMediaAccountsTable)
    .values({
      organizationId,
      businessId,
      platform: payload.platform,
      externalAccountId: payload.externalAccountId,
      displayName: payload.displayName,
      username: payload.username,
      profileUrl: payload.profileUrl,
      status: "CONNECTED",
      lastError: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        socialMediaAccountsTable.businessId,
        socialMediaAccountsTable.platform,
        socialMediaAccountsTable.externalAccountId,
      ],
      set: {
        displayName: payload.displayName,
        username: payload.username,
        profileUrl: payload.profileUrl,
        status: "CONNECTED",
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return toAccountPayload(saved);
}

export async function detachSocialMediaAccount(
  organizationId: string,
  id: string,
) {
  const deleted = await db
    .delete(socialMediaAccountsTable)
    .where(
      and(
        eq(socialMediaAccountsTable.id, id),
        eq(socialMediaAccountsTable.organizationId, organizationId),
      ),
    )
    .returning({ id: socialMediaAccountsTable.id });
  if (deleted.length === 0) throw new SocialMediaNotFoundError("Account not found.");
}

function postPayload(raw: JsonRecord) {
  const platforms = asArray(raw.socialAccountTypes)
    .map((value) => providerPlatform(value))
    .filter((platform): platform is Platform => Boolean(platform));
  const platformData = Object.values(asRecord(raw.data))
    .map(asRecord)
    .find((data) =>
      ["text", "message", "caption", "content"].some((key) =>
        valueString(data[key]),
      ),
    );
  return {
    id: valueString(raw.id) ?? valueString(raw.postId) ?? "",
    title: valueString(raw.title),
    caption:
      valueString(raw.caption) ??
      valueString(raw.text) ??
      valueString(raw.message) ??
      valueString(platformData?.text) ??
      valueString(platformData?.message) ??
      valueString(platformData?.caption) ??
      valueString(platformData?.content),
    status: valueString(raw.status) ?? "UNKNOWN",
    scheduledAt: valueDate(raw.postDate),
    publishedAt: valueDate(raw.publishedAt) ?? valueDate(raw.publishedAtAt),
    platforms,
    raw,
  };
}

async function getBusinessTeam(
  organizationId: string,
  businessId: string,
) {
  await getBusiness(organizationId, businessId);
  const teamId = await getTeamId(organizationId);
  const accounts = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(
      and(
        eq(socialMediaAccountsTable.organizationId, organizationId),
        eq(socialMediaAccountsTable.businessId, businessId),
        eq(socialMediaAccountsTable.status, "CONNECTED"),
      ),
    );
  return { teamId, accounts };
}

export async function createSocialMediaPost(
  organizationId: string,
  input: {
    businessId: string;
    title?: string;
    caption: string;
    platforms: Platform[];
    scheduledAt?: Date | string | null;
  },
) {
  const { teamId, accounts } = await getBusinessTeam(
    organizationId,
    input.businessId,
  );
  const selected = new Set(accounts.map((account) => account.platform));
  const missing = input.platforms.filter((platform) => !selected.has(platform));
  if (missing.length) {
    throw new SocialMediaBadRequestError(
      `Connect ${missing.join(", ")} before publishing to those channels.`,
    );
  }
  const scheduledDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new SocialMediaBadRequestError("Choose a valid publishing time.");
  }
  const isScheduled = scheduledDate.getTime() > Date.now() + 30_000;
  const data = Object.fromEntries(
    input.platforms.map((platform) => [
      platform,
      platform === "INSTAGRAM"
        ? { type: "POST", text: input.caption }
        : { text: input.caption },
    ]),
  );
  const created = await bndleRequest("post", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      title: input.title?.trim() || undefined,
      postDate: scheduledDate.toISOString(),
      status: isScheduled ? "SCHEDULED" : "PUBLISHED",
      socialAccountTypes: input.platforms,
      data,
    }),
  });
  return postPayload(created);
}

export async function listSocialMediaPosts(
  organizationId: string,
  businessId: string,
) {
  const { teamId } = await getBusinessTeam(organizationId, businessId);
  const result = await bndleRequest("post", undefined, { teamId });
  const posts = asArray(result.posts ?? result.data ?? result.items)
    .map(postPayload)
    .filter((post) => post.id);
  return { posts };
}

function commentPayload(raw: JsonRecord) {
  const externalId = valueString(raw.externalId) ?? valueString(raw.id) ?? "";
  return {
    id: externalId,
    externalId,
    postId: valueString(raw.externalPostId) ?? valueString(raw.postId),
    text: valueString(raw.text) ?? valueString(raw.message) ?? "",
    authorName:
      valueString(raw.authorName) ??
      valueString(raw.authorDisplayName) ??
      "Social follower",
    parentCommentId:
      valueString(raw.externalParentId) ?? valueString(raw.parentCommentId),
    createdAt: valueDate(raw.createdAt) ?? valueDate(raw.createdTime),
    canReply: true,
  };
}

export async function importSocialMediaComments(
  organizationId: string,
  input: { businessId: string; postId?: string | null; importedPostId?: string | null },
) {
  const { teamId } = await getBusinessTeam(organizationId, input.businessId);
  if (Boolean(input.postId) === Boolean(input.importedPostId)) {
    throw new SocialMediaBadRequestError(
      "Choose one published post to import comments from.",
    );
  }
  const result = await bndleRequest("comment/import", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      ...(input.postId ? { postId: input.postId } : { importedPostId: input.importedPostId }),
    }),
  });
  return {
    importId: valueString(result.importId) ?? valueString(result.id),
    status: valueString(result.status) ?? "FETCHING",
  };
}

export async function listSocialMediaComments(
  organizationId: string,
  businessId: string,
  postId?: string,
) {
  const { teamId } = await getBusinessTeam(organizationId, businessId);
  if (!postId) return { comments: [] };
  const result = await bndleRequest(
    "comment/import/comments",
    undefined,
    { teamId, postId },
  );
  return {
    comments: asArray(result.comments ?? result.data ?? result.items).map(commentPayload),
  };
}

export async function replyToSocialMediaComment(
  organizationId: string,
  businessId: string,
  commentId: string,
  text: string,
) {
  const { teamId } = await getBusinessTeam(organizationId, businessId);
  const result = await bndleRequest("comment", {
    method: "POST",
    body: JSON.stringify({
      teamId,
      fetchedParentCommentId: commentId,
      text: text.trim(),
    }),
  });
  return commentPayload(result);
}