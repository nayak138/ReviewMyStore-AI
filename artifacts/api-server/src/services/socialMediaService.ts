import { and, eq, isNotNull } from "drizzle-orm";
import {
  businessesTable,
  db,
  objectUploadsTable,
  providerConnectionsTable,
  socialMediaAccountsTable,
  socialMediaProviderTeamsTable,
} from "@workspace/db";
import {
  bndleRequest,
  createSocialMediaProviderTeam,
  withProviderOperationLock,
  ReviewProviderError,
} from "./reviewManagementService";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectPermission,
} from "../lib/objectAcl";
import { logger } from "../lib/logger";

type JsonRecord = Record<string, unknown>;
type Platform = "FACEBOOK" | "INSTAGRAM" | "THREADS";
const PLATFORMS: readonly Platform[] = ["FACEBOOK", "INSTAGRAM", "THREADS"];
const MEDIA_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const objectStorageService = new ObjectStorageService();

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

function arrayValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function providerAccountId(account: JsonRecord): string | null {
  return valueString(account.id);
}

function providerTargetId(account: JsonRecord): string | null {
  return valueString(account.externalId) ?? providerAccountId(account);
}

function providerChannels(account: JsonRecord): JsonRecord[] {
  return asArray(account.channels);
}

function requiresChannelSelection(account: JsonRecord): boolean {
  const platform = providerPlatform(account.type);
  if (platform === "FACEBOOK") return true;
  return (
    platform === "INSTAGRAM" &&
    valueString(account.instagramConnectionMethod)?.toUpperCase() !== "INSTAGRAM"
  );
}

function getAppOrigin(): string | null {
  const domain =
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ||
    process.env.REPLIT_DEV_DOMAIN?.trim();
  return domain ? `https://${domain}` : null;
}

function socialMediaPublicUrl(
  objectPath: string,
  appOrigin = getAppOrigin(),
): string {
  const origin = appOrigin;
  if (!origin) {
    throw new SocialMediaBadRequestError(
      "Could not determine this app's URL to upload the selected media.",
    );
  }
  const relativePath = objectPath.replace(/^\/objects\//, "");
  return `${origin}/api/storage/public-assets/${relativePath}`;
}

async function uploadMediaToProvider(
  teamId: string,
  clerkUserId: string,
  mediaPaths: string[],
  appOrigin?: string,
): Promise<string[]> {
  const uniquePaths = [...new Set(mediaPaths)];
  if (uniquePaths.length !== mediaPaths.length) {
    throw new SocialMediaBadRequestError("Each media item can only be attached once.");
  }
  if (uniquePaths.length > 10) {
    throw new SocialMediaBadRequestError("Attach up to 10 images or videos.");
  }

  return Promise.all(
    uniquePaths.map(async (objectPath) => {
      if (!/^\/objects\/uploads\/[^/]+$/.test(objectPath)) {
        throw new SocialMediaBadRequestError("One of the selected media files is invalid.");
      }
      const [upload] = await db
        .select({ objectPath: objectUploadsTable.objectPath })
        .from(objectUploadsTable)
        .where(
          and(
            eq(objectUploadsTable.objectPath, objectPath),
            eq(objectUploadsTable.ownerClerkUserId, clerkUserId),
            isNotNull(objectUploadsTable.finalizedAt),
          ),
        )
        .limit(1);
      if (!upload) {
        throw new SocialMediaBadRequestError(
          "One of the selected media files is unavailable. Upload it again before publishing.",
        );
      }
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      const aclPolicy = await getObjectAclPolicy(objectFile);
      const isPublic = aclPolicy
        ? await canAccessObject({
            objectFile,
            requestedPermission: ObjectPermission.READ,
          })
        : false;
      if (!isPublic) {
        throw new SocialMediaBadRequestError(
          "One of the selected media files is not ready for publishing. Upload it again before publishing.",
        );
      }
      const [metadata] = await objectFile.getMetadata();
      const contentType = valueString(metadata.contentType)?.toLowerCase() ?? "";
      const size = Number(metadata.size);
      if (!MEDIA_CONTENT_TYPES.has(contentType)) {
        throw new SocialMediaBadRequestError(
          "Use a JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.",
        );
      }
      if (!Number.isFinite(size) || size <= 0) {
        throw new SocialMediaBadRequestError("One of the selected media files is empty.");
      }
      const maximum = contentType.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (size > maximum) {
        throw new SocialMediaBadRequestError(
          contentType.startsWith("image/")
            ? "Images must be 25 MB or smaller."
            : "Videos must be 100 MB or smaller.",
        );
      }
      const uploaded = await bndleRequest("upload/from-url", {
        method: "POST",
        body: JSON.stringify({
          teamId,
          url: socialMediaPublicUrl(objectPath, appOrigin),
        }),
      });
      const uploadId = valueString(uploaded.id) ?? valueString(uploaded.uploadId);
      if (!uploadId) {
        throw new SocialMediaBadRequestError(
          "The social provider could not prepare one of the selected media files.",
        );
      }
      return uploadId;
    }),
  );
}

async function removePublishedMedia(
  mediaPaths: string[],
  clerkUserId: string,
): Promise<void> {
  await Promise.all(
    mediaPaths.map(async (objectPath) => {
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        await objectFile.delete();
        await db
          .delete(objectUploadsTable)
          .where(
            and(
              eq(objectUploadsTable.objectPath, objectPath),
              eq(objectUploadsTable.ownerClerkUserId, clerkUserId),
            ),
          );
      } catch (error) {
        logger.error(
          { err: error, objectPath },
          "Could not remove social media after provider accepted the post",
        );
      }
    }),
  );
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
  const externalAccountId = providerTargetId(account);
  if (!externalAccountId) return null;
  return {
    externalAccountId,
    platform,
    displayName:
      valueString(account.displayName) ??
      valueString(account.name) ??
      valueString(account.userDisplayName) ??
      valueString(account.username) ??
      `${platform[0]}${platform.slice(1).toLowerCase()} account`,
    username: valueString(account.username) ?? valueString(account.userUsername),
    profileUrl:
      valueString(account.profileUrl) ??
      valueString(account.avatarUrl) ??
      valueString(account.url),
    connected,
  };
}

function providerChannelPayload(
  account: JsonRecord,
  channel: JsonRecord,
  connected: boolean,
) {
  const platform = providerPlatform(account.type);
  const externalAccountId = valueString(channel.id);
  if (!platform || !externalAccountId) return null;
  return {
    externalAccountId,
    platform,
    displayName:
      valueString(channel.displayName) ??
      valueString(channel.name) ??
      valueString(channel.username) ??
      `${platform[0]}${platform.slice(1).toLowerCase()} account`,
    username: valueString(channel.username),
    profileUrl:
      valueString(channel.profileUrl) ??
      valueString(channel.avatarUrl) ??
      valueString(channel.url),
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

export async function requestSocialMediaMediaUploadUrl(
  organizationId: string,
  clerkUserId: string,
  input: {
    businessId: string;
    name: string;
    size: number;
    contentType: string;
  },
) {
  await getBusiness(organizationId, input.businessId);
  const contentType = input.contentType.toLowerCase();
  if (!MEDIA_CONTENT_TYPES.has(contentType)) {
    throw new SocialMediaBadRequestError(
      "Use a JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM file.",
    );
  }
  const maximum = contentType.startsWith("image/")
    ? MAX_IMAGE_BYTES
    : MAX_VIDEO_BYTES;
  if (input.size > maximum) {
    throw new SocialMediaBadRequestError(
      contentType.startsWith("image/")
        ? "Images must be 25 MB or smaller."
        : "Videos must be 100 MB or smaller.",
    );
  }
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
  await db.insert(objectUploadsTable).values({
    objectPath,
    ownerClerkUserId: clerkUserId,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  return {
    uploadURL,
    objectPath,
    metadata: {
      name: input.name,
      size: input.size,
      contentType,
    },
  };
}

async function getLegacyTeamId(organizationId: string): Promise<string | null> {
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
  return connection?.externalProfileId ?? null;
}

async function findBusinessTeam(
  organizationId: string,
  businessId: string,
): Promise<string | null> {
  const [existing] = await db
    .select({ externalTeamId: socialMediaProviderTeamsTable.externalTeamId })
    .from(socialMediaProviderTeamsTable)
    .where(
      and(
        eq(socialMediaProviderTeamsTable.organizationId, organizationId),
        eq(socialMediaProviderTeamsTable.businessId, businessId),
      ),
    )
    .limit(1);
  return existing?.externalTeamId ?? null;
}

async function getOrCreateBusinessTeam(
  organizationId: string,
  businessId: string,
): Promise<string> {
  const existingTeamId = await findBusinessTeam(organizationId, businessId);
  if (existingTeamId) return existingTeamId;

  return withProviderOperationLock(organizationId, async () => {
    const lockedExistingTeamId = await findBusinessTeam(organizationId, businessId);
    if (lockedExistingTeamId) return lockedExistingTeamId;

    // Preserve an existing social setup when this organization has only ever
    // used its review team for one business. Once more than one business has
    // local social accounts, sharing that legacy team is unsafe, so all new
    // business mappings receive their own provider team.
    const legacyAccounts = await db
      .select({ businessId: socialMediaAccountsTable.businessId })
      .from(socialMediaAccountsTable)
      .where(eq(socialMediaAccountsTable.organizationId, organizationId));
    const legacyBusinessIds = new Set(
      legacyAccounts.map((account) => account.businessId),
    );
    const legacyTeamId =
      legacyBusinessIds.size === 1 &&
      legacyBusinessIds.has(businessId)
        ? await getLegacyTeamId(organizationId)
        : null;
    const teamId =
      legacyTeamId ??
      (await createSocialMediaProviderTeam(organizationId, businessId));

    const [saved] = await db
      .insert(socialMediaProviderTeamsTable)
      .values({
        organizationId,
        businessId,
        externalTeamId: teamId,
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: socialMediaProviderTeamsTable.businessId,
      })
      .returning({ externalTeamId: socialMediaProviderTeamsTable.externalTeamId });
    return saved?.externalTeamId ?? teamId;
  });
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
    getOrCreateBusinessTeam(organizationId, businessId),
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
  const readyTargets = new Set(
    providerAccounts
      .filter(
        (account) =>
          !requiresChannelSelection(account) || Boolean(valueString(account.externalId)),
      )
      .map((account) => {
        const platform = providerPlatform(account.type);
        const targetId = providerTargetId(account);
        return platform && targetId ? `${platform}:${targetId}` : null;
      })
      .filter((target): target is string => Boolean(target)),
  );
  const readyLocalAccounts = localAccounts.filter((account) =>
    readyTargets.has(`${account.platform}:${account.externalAccountId}`),
  );
  const connectedIds = new Set(
    readyLocalAccounts.map(
      (account) => `${account.platform}:${account.externalAccountId}`,
    ),
  );
  const availableAccounts = providerAccounts
    .flatMap((account) => {
      const platform = providerPlatform(account.type);
      if (!platform) return [];
      if (requiresChannelSelection(account)) {
        const selectedTargetId = valueString(account.externalId);
        return providerChannels(account).map((channel) =>
          providerChannelPayload(
            account,
            channel,
            selectedTargetId === valueString(channel.id) &&
              connectedIds.has(`${platform}:${valueString(channel.id)}`),
          ),
        );
      }
      const targetId = providerTargetId(account);
      return [
        providerAccountPayload(
          account,
          Boolean(targetId && connectedIds.has(`${platform}:${targetId}`)),
        ),
      ];
    })
    .filter((account): account is NonNullable<typeof account> => Boolean(account));

  return {
    teamId,
    accounts: readyLocalAccounts.map(toAccountPayload),
    availableAccounts,
  };
}

export async function startSocialMediaConnection(
  organizationId: string,
  businessId: string,
  platform: Platform,
  appOrigin?: string,
) {
  await getBusiness(organizationId, businessId);
  const callbackOrigin = appOrigin ?? getAppOrigin();
  if (!callbackOrigin) {
    throw new SocialMediaBadRequestError(
      "Could not determine this app's URL to complete the connection.",
    );
  }
  const teamId = await getOrCreateBusinessTeam(organizationId, businessId);
  const result = await bndleRequest("social-account/connect", {
    method: "POST",
    body: JSON.stringify({
      type: platform,
      teamId,
      redirectUrl: `${callbackOrigin}/social-media?businessId=${encodeURIComponent(businessId)}&socialConnect=1`,
      disableAutoLogin: true,
      ...(platform === "INSTAGRAM"
        ? { instagramConnectionMethod: "FACEBOOK" }
        : {}),
      ...(["FACEBOOK", "INSTAGRAM"].includes(platform)
        ? { withBusinessScope: true }
        : {}),
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
  const teamId = await getOrCreateBusinessTeam(organizationId, businessId);
  const providerAccounts = await getProviderAccounts(teamId);
  const channelMatch = providerAccounts
    .map((account) => ({
      account,
      channel: providerChannels(account).find(
        (channel) => valueString(channel.id) === externalAccountId,
      ),
    }))
    .find((match) => match.channel);
  const account =
    channelMatch?.account ??
    providerAccounts.find(
      (candidate) =>
        providerAccountId(candidate) === externalAccountId ||
        valueString(candidate.externalId) === externalAccountId,
    );
  const payload =
    account && channelMatch?.channel
      ? providerChannelPayload(account, channelMatch.channel, true)
      : account
        ? providerAccountPayload(account, true)
        : null;
  if (!payload) {
    throw new SocialMediaNotFoundError(
      "That connected social account is no longer available.",
    );
  }
  if (
    account &&
    requiresChannelSelection(account) &&
    !channelMatch?.channel &&
    !valueString(account.externalId)
  ) {
    throw new SocialMediaBadRequestError(
      `Choose the ${payload.platform === "FACEBOOK" ? "Facebook Page" : "Instagram account"} you want to publish to.`,
    );
  }

  if (channelMatch?.channel) {
    if (account && requiresChannelSelection(account)) {
      // bundle.social keeps one active Page/account per team. Re-selecting a
      // different target requires clearing the previous target first.
      await bndleRequest("social-account/unset-channel", {
        method: "POST",
        body: JSON.stringify({ type: payload.platform, teamId }),
      });
    }
    await bndleRequest("social-account/set-channel", {
      method: "POST",
      body: JSON.stringify({
        type: payload.platform,
        teamId,
        channelId: payload.externalAccountId,
      }),
    });
  }

  const saved = await db.transaction(async (tx) => {
    await tx
      .delete(socialMediaAccountsTable)
      .where(
        and(
          eq(socialMediaAccountsTable.organizationId, organizationId),
          eq(socialMediaAccountsTable.businessId, businessId),
          eq(socialMediaAccountsTable.platform, payload.platform),
        ),
      );
    const [row] = await tx
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
      .returning();
    return row;
  });
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
  const platforms = [
    ...arrayValues(raw.socialAccountTypes).map((value) => providerPlatform(value)),
    ...arrayValues(raw.platforms).map((value) => providerPlatform(value)),
    ...arrayValues(raw.socialAccounts).map((value) => {
      const account = asRecord(value);
      return providerPlatform(
        account.type ?? account.platform ?? account.socialAccountType,
      );
    }),
    ...Object.keys(asRecord(raw.data)).map((value) => providerPlatform(value)),
  ].filter(
    (platform, index, values): platform is Platform =>
      Boolean(platform) && values.indexOf(platform) === index,
  );
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
  const teamId = await getOrCreateBusinessTeam(organizationId, businessId);
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

async function getReadyBusinessAccounts(
  teamId: string,
  accounts: typeof socialMediaAccountsTable.$inferSelect[],
) {
  const providerAccounts = await getProviderAccounts(teamId);
  const readyTargets = new Set(
    providerAccounts
      .filter(
        (account) =>
          !requiresChannelSelection(account) || Boolean(valueString(account.externalId)),
      )
      .map((account) => {
        const platform = providerPlatform(account.type);
        const targetId = providerTargetId(account);
        return platform && targetId ? `${platform}:${targetId}` : null;
      })
      .filter((target): target is string => Boolean(target)),
  );
  return accounts.filter((account) =>
    readyTargets.has(`${account.platform}:${account.externalAccountId}`),
  );
}

export async function createSocialMediaPost(
  organizationId: string,
  clerkUserId: string,
  input: {
    businessId: string;
    title?: string;
    caption: string;
    platforms: Platform[];
    media?: string[];
    scheduledAt?: Date | string | null;
  },
  appOrigin?: string,
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
  const mediaPaths = input.media ?? [];
  if (input.platforms.includes("INSTAGRAM") && mediaPaths.length === 0) {
    throw new SocialMediaBadRequestError(
      "Instagram requires at least one uploaded image or video.",
    );
  }
  const scheduledDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new SocialMediaBadRequestError("Choose a valid publishing time.");
  }
  const isScheduled = Boolean(input.scheduledAt);
  if (isScheduled && scheduledDate.getTime() <= Date.now() + 60_000) {
    throw new SocialMediaBadRequestError(
      "Choose a publishing time at least one minute in the future.",
    );
  }
  let uploadIds: string[] = [];
  try {
    if (mediaPaths.length) {
      uploadIds = await uploadMediaToProvider(
        teamId,
        clerkUserId,
        mediaPaths,
        appOrigin,
      );
    }
  } catch (error) {
    if (error instanceof SocialMediaBadRequestError) throw error;
    if (error instanceof ReviewProviderError) {
      throw new SocialMediaBadRequestError(
        "The social provider could not process the selected media. Check the file and try again.",
      );
    }
    throw error;
  }
  const readyAccounts = await getReadyBusinessAccounts(teamId, accounts);
  const missingProviderTargets = input.platforms.filter(
    (platform) => !readyAccounts.some((account) => account.platform === platform),
  );
  if (missingProviderTargets.length) {
    throw new SocialMediaBadRequestError(
      `Connect ${missingProviderTargets.join(", ")} before publishing to those channels.`,
    );
  }
  const data = Object.fromEntries(
    input.platforms.map((platform) => [
      platform,
      {
        // bundle.social validates a platform-specific post type for Facebook
        // and Instagram. Facebook was the one omission here: although some
        // provider versions default it to POST, the current validation
        // rejects a combined Facebook + Instagram payload without it. Threads
        // has a different payload shape and must not receive this field.
        ...(
          platform === "FACEBOOK" || platform === "INSTAGRAM"
            ? { type: "POST" }
            : {}
        ),
        text: input.caption,
        ...(uploadIds.length ? { uploadIds } : {}),
      },
    ]),
  );
  // bundle.social requires a top-level title even when the internal title is
  // optional in our UI. Use the first part of the caption as a useful
  // fallback so text-only and scheduled posts satisfy the provider schema.
  const postTitle =
    input.title?.trim() ||
    input.caption.trim().replace(/\s+/g, " ").slice(0, 80) ||
    "Social media post";
  let created: JsonRecord;
  try {
    created = await bndleRequest("post", {
      method: "POST",
      body: JSON.stringify({
        teamId,
        title: postTitle,
        postDate: scheduledDate.toISOString(),
        // The provider only accepts DRAFT or SCHEDULED when creating a post.
        // A SCHEDULED post dated now is picked up for immediate publishing;
        // PUBLISHED is a provider-managed result state, not a create input.
        status: "SCHEDULED",
        socialAccountTypes: input.platforms,
        data,
      }),
    });
  } catch (error) {
    if (error instanceof ReviewProviderError && error.upstreamStatus === 400) {
      const providerMessage = error.providerMessage?.toLowerCase() ?? "";
      if (
        ["channel", "externalid", "page", "target"].some((term) =>
          providerMessage.includes(term),
        )
      ) {
        throw new SocialMediaBadRequestError(
          "The selected Page or account is not ready for publishing. Refresh connected channels and choose it again.",
        );
      }
      if (
        ["postdate", "schedule", "future", "date"].some((term) =>
          providerMessage.includes(term),
        )
      ) {
        throw new SocialMediaBadRequestError(
          "The provider rejected that publishing time. Choose a time at least one minute in the future.",
        );
      }
      if (
        ["upload", "media", "image", "video", "file"].some((term) =>
          providerMessage.includes(term),
        )
      ) {
        throw new SocialMediaBadRequestError(
          "The social provider rejected the selected media. Use a supported image or video and try again.",
        );
      }
      throw new SocialMediaBadRequestError(
        "The social provider rejected this post. Refresh the connected channel and check the post details before trying again.",
      );
    }
    throw error;
  }
  if (mediaPaths.length) {
    await removePublishedMedia(mediaPaths, clerkUserId);
  }
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
  input: {
    businessId: string;
    platform: Platform;
    postId?: string | null;
    importedPostId?: string | null;
  },
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
      socialAccountType: input.platform,
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