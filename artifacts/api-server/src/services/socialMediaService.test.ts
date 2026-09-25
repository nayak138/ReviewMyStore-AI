import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  businessesTable,
  businessSocialCommentsTable,
  db,
  objectUploadsTable,
  organizationsTable,
  pool,
  providerConnectionsTable,
  socialMediaAccountsTable,
  socialMediaProviderTeamsTable,
} from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  attachSocialMediaAccount,
  createSocialMediaPost,
  disconnectSocialMediaConnection,
  getSocialMediaDashboard,
  importSocialMediaComments,
  listSocialMediaComments,
  listSocialMediaPosts,
  replyToSocialMediaComment,
  requestSocialMediaMediaUploadUrl,
  SocialMediaBadRequestError,
  SocialMediaConflictError,
} from "./socialMediaService";
import {
  BusinessUsageLimitError,
  completeBusinessUsageReservation,
  getBusinessUsageSummary,
  releaseBusinessUsageReservation,
  reserveBusinessUsage,
  settleMediaUploadReservations,
} from "./businessUsageService";

const runId = randomUUID().slice(0, 8);
const ownerId = `social-owner-${runId}`;
const otherOwnerId = `social-other-${runId}`;
const BNDLE_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://api.bundle.social";

let organizationId: string;
let businessId: string;
let secondBusinessId: string;
let providerCalls: Array<{ path: string; body: Record<string, unknown> }> = [];
let postResponse: { status: number; body: Record<string, unknown> } | null =
  null;
let commentListOverride: Array<Record<string, unknown>> | null = null;
let facebookProviderExternalId = `facebook-${runId}`;
let providerSocialAccountsOverride: unknown[] | null = null;
const originalFetch = globalThis.fetch;
const originalGetObject = ObjectStorageService.prototype.getObjectEntityFile;
const originalGetUploadURL = ObjectStorageService.prototype.getObjectEntityUploadURL;
const originalNormalizeObjectPath =
  ObjectStorageService.prototype.normalizeObjectEntityPath;
let uploadUrlCount = 0;

const objectMetadata = new Map<
  string,
  { contentType: string; size: string }
>();
let deletedObjectPaths: string[] = [];

before(async () => {
  process.env.REPLIT_DOMAINS = "social-media-test.example.com";
  ObjectStorageService.prototype.getObjectEntityFile = (async (objectPath) => {
    const media = objectMetadata.get(objectPath) ?? {
      contentType: "image/jpeg",
      size: "1024",
    };
    return {
      getMetadata: async () => [
        {
          contentType: media.contentType,
          size: media.size,
          metadata: {
            "custom:aclPolicy": JSON.stringify({
              owner: ownerId,
              visibility: "public",
            }),
          },
        },
      ],
      delete: async () => {
        deletedObjectPaths.push(objectPath);
      },
    } as never;
  }) as typeof ObjectStorageService.prototype.getObjectEntityFile;
  ObjectStorageService.prototype.getObjectEntityUploadURL = async () =>
    `https://storage.googleapis.com/test-bucket/uploads/${runId}-${++uploadUrlCount}`;
  ObjectStorageService.prototype.normalizeObjectEntityPath = (rawPath) =>
    `/objects/uploads/${rawPath.split("/").at(-1)}`;
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (!url.startsWith(BNDLE_BASE)) return originalFetch(input as never, init);
    const path = new URL(url).pathname.replace("/api/v1/", "");
    providerCalls.push({
      path,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    if (path.startsWith("team/")) {
      const teamId = path.slice("team/".length);
      const isSecondBusinessTeam = teamId === `team-second-${runId}`;
      return new Response(
        JSON.stringify({
          socialAccounts: providerSocialAccountsOverride ?? [
            {
              id: `threads-provider-${isSecondBusinessTeam ? "second" : "primary"}-${runId}`,
              type: "THREADS",
              externalId: isSecondBusinessTeam
                ? `threads-second-${runId}`
                : `threads-${runId}`,
            },
            {
              id: `facebook-provider-${isSecondBusinessTeam ? "second" : "primary"}-${runId}`,
              type: "FACEBOOK",
              externalId: isSecondBusinessTeam
                ? `facebook-second-${runId}`
                : facebookProviderExternalId,
              channels: isSecondBusinessTeam
                ? undefined
                : [
                    {
                      id: `facebook-${runId}`,
                      displayName: "Original Facebook Page",
                      username: "original-page",
                    },
                    {
                      id: `facebook-page-new-${runId}`,
                      displayName: "New Facebook Page",
                      username: "new-page",
                    },
                  ],
            },
            {
              id: `instagram-provider-${isSecondBusinessTeam ? "second" : "primary"}-${runId}`,
              type: "INSTAGRAM",
              externalId: isSecondBusinessTeam
                ? `instagram-second-${runId}`
                : `instagram-${runId}`,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (path === "social-account/set-channel") {
      facebookProviderExternalId = String(
        providerCalls.at(-1)?.body.channelId ?? "",
      );
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path === "upload/from-url") {
      const uploadNumber = providerCalls.filter(
        (call) => call.path === "upload/from-url",
      ).length;
      return new Response(JSON.stringify({ id: `upload-${uploadNumber}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path === "post" && postResponse) {
      return new Response(JSON.stringify(postResponse.body), {
        status: postResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path === "comment/import") {
      return new Response(JSON.stringify({ id: "comment-import-test", status: "FETCHING" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (path === "comment/import/comments") {
      return new Response(
        JSON.stringify({
          items: commentListOverride ?? [
            {
              id: "fetched-comment-test",
              externalId: "platform-comment-test",
              text: "A fetched comment",
              authorName: "A customer",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "post-media-test",
        socialAccountTypes: ["INSTAGRAM"],
        data: { INSTAGRAM: { text: "Media post" } },
        status: "PUBLISHED",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const [organization] = await db
    .insert(organizationsTable)
    .values({ name: `Social media test ${runId}`, slug: `social-media-${runId}` })
    .returning();
  organizationId = organization.id;
  const [business] = await db
    .insert(businessesTable)
    .values({
      organizationId,
      name: "Media Test Store",
      category: "Retail",
      slug: `media-test-store-${runId}`,
      status: "ACTIVE",
    })
    .returning();
  businessId = business.id;
  const [secondBusiness] = await db
    .insert(businessesTable)
    .values({
      organizationId,
      name: "Second Media Test Store",
      category: "Retail",
      slug: `second-media-test-store-${runId}`,
      status: "ACTIVE",
    })
    .returning();
  secondBusinessId = secondBusiness.id;
  await db.insert(providerConnectionsTable).values({
    organizationId,
    provider: "BNDLE",
    externalProfileId: `team-${runId}`,
    status: "CONNECTED",
  });
  await db.insert(socialMediaAccountsTable).values({
    organizationId,
    businessId,
    platform: "THREADS",
    externalAccountId: `threads-${runId}`,
    displayName: "Media test Threads",
    status: "CONNECTED",
  });
  await db.insert(socialMediaAccountsTable).values({
    organizationId,
    businessId,
    platform: "FACEBOOK",
    externalAccountId: `facebook-${runId}`,
    displayName: "Media test Facebook",
    status: "CONNECTED",
  });
  await db.insert(socialMediaAccountsTable).values({
    organizationId,
    businessId,
    platform: "INSTAGRAM",
    externalAccountId: `instagram-${runId}`,
    displayName: "Media test Instagram",
    status: "CONNECTED",
  });
  await db.insert(socialMediaAccountsTable).values({
    organizationId,
    businessId: secondBusinessId,
    platform: "INSTAGRAM",
    externalAccountId: `instagram-second-${runId}`,
    displayName: "Second media test Instagram",
    status: "CONNECTED",
  });
  await db.insert(socialMediaProviderTeamsTable).values([
    {
      organizationId,
      businessId,
      externalTeamId: `team-${runId}`,
    },
    {
      organizationId,
      businessId: secondBusinessId,
      externalTeamId: `team-second-${runId}`,
    },
  ]);
});

beforeEach(async () => {
  providerCalls = [];
  postResponse = null;
  commentListOverride = null;
  uploadUrlCount = 0;
  facebookProviderExternalId = `facebook-${runId}`;
  providerSocialAccountsOverride = null;
  objectMetadata.clear();
  deletedObjectPaths = [];
  await db
    .delete(objectUploadsTable)
    .where(eq(objectUploadsTable.ownerClerkUserId, ownerId));
  await db
    .delete(objectUploadsTable)
    .where(eq(objectUploadsTable.ownerClerkUserId, otherOwnerId));
});

after(async () => {
  globalThis.fetch = originalFetch;
  ObjectStorageService.prototype.getObjectEntityFile = originalGetObject;
  ObjectStorageService.prototype.getObjectEntityUploadURL = originalGetUploadURL;
  ObjectStorageService.prototype.normalizeObjectEntityPath =
    originalNormalizeObjectPath;
  if (organizationId) {
    await db
      .delete(objectUploadsTable)
      .where(eq(objectUploadsTable.ownerClerkUserId, ownerId));
    await db
      .delete(objectUploadsTable)
      .where(eq(objectUploadsTable.ownerClerkUserId, otherOwnerId));
    await db.delete(organizationsTable).where(eq(organizationsTable.id, organizationId));
  }
  await pool.end();
});

async function addUpload(
  objectPath: string,
  ownerClerkUserId: string,
  finalized = true,
) {
  await db.insert(objectUploadsTable).values({
    objectPath,
    ownerClerkUserId,
    expiresAt: new Date(Date.now() + 60_000),
    ...(finalized ? { finalizedAt: new Date() } : {}),
  });
}

async function publishWith(objectPath: string) {
  return createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "Media post",
    platforms: ["INSTAGRAM"],
    media: [objectPath],
  });
}

test("rejects foreign, unfinished, and missing media before calling the provider", async () => {
  const foreignPath = `/objects/uploads/foreign-${runId}`;
  const unfinishedPath = `/objects/uploads/unfinished-${runId}`;
  await addUpload(foreignPath, otherOwnerId);
  await addUpload(unfinishedPath, ownerId, false);

  for (const objectPath of [
    foreignPath,
    unfinishedPath,
    `/objects/uploads/missing-${runId}`,
  ]) {
    await assert.rejects(
      () => publishWith(objectPath),
      SocialMediaBadRequestError,
    );
  }
  assert.equal(providerCalls.length, 0);
});

test("rejects unsupported and oversized owned media before calling the provider", async () => {
  const unsupportedPath = `/objects/uploads/unsupported-${runId}`;
  const oversizedImagePath = `/objects/uploads/oversized-image-${runId}`;
  const oversizedVideoPath = `/objects/uploads/oversized-video-${runId}`;
  await addUpload(unsupportedPath, ownerId);
  await addUpload(oversizedImagePath, ownerId);
  await addUpload(oversizedVideoPath, ownerId);
  objectMetadata.set(unsupportedPath, {
    contentType: "application/pdf",
    size: "1024",
  });
  objectMetadata.set(oversizedImagePath, {
    contentType: "image/jpeg",
    size: String(25 * 1024 * 1024 + 1),
  });
  objectMetadata.set(oversizedVideoPath, {
    contentType: "video/mp4",
    size: String(100 * 1024 * 1024 + 1),
  });

  for (const objectPath of [
    unsupportedPath,
    oversizedImagePath,
    oversizedVideoPath,
  ]) {
    await assert.rejects(
      () => publishWith(objectPath),
      SocialMediaBadRequestError,
    );
  }
  assert.equal(providerCalls.length, 0);
});

test("settles daily and monthly usage only for finalized media uploads", async () => {
  const upload = await requestSocialMediaMediaUploadUrl(
    organizationId,
    ownerId,
    {
      businessId,
      name: "photo.jpg",
      size: 1024,
      contentType: "image/jpeg",
    },
  );
  await db
    .update(objectUploadsTable)
    .set({ finalizedAt: new Date() })
    .where(eq(objectUploadsTable.objectPath, upload.objectPath));
  assert.equal(
    await settleMediaUploadReservations(upload.objectPath, "SUCCEEDED"),
    2,
  );
  const usage = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_MEDIA_UPLOADS")?.used,
    1,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_MEDIA_UPLOADS_MONTHLY")?.used,
    1,
  );
});

test("daily post, comment, and media caps stop new provider actions", async () => {
  const usage = await getBusinessUsageSummary(organizationId, secondBusinessId);
  const postAllowance = usage.find((item) => item.metric === "SOCIAL_POSTS");
  assert.ok(postAllowance && postAllowance.remaining > 0);
  const postFill = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_POSTS",
    amount: postAllowance.remaining,
  });
  const commentFill = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_COMMENT_DAILY_UNITS",
    amount: 5,
  });
  const mediaFill = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_MEDIA_UPLOADS",
    amount: 100,
  });
  const olderCommentId = `older-comment-at-cap-${runId}`;
  const importedAt = new Date();
  importedAt.setUTCDate(importedAt.getUTCDate() - 1);
  await db.insert(businessSocialCommentsTable).values({
    organizationId,
    businessId: secondBusinessId,
    providerCommentId: olderCommentId,
    providerPostId: "post-cap-test",
    importedAt,
  });
  const mediaPath = `/objects/uploads/cap-check-${runId}`;
  await addUpload(mediaPath, ownerId);
  const providerStart = providerCalls.length;

  await assert.rejects(
    () =>
      createSocialMediaPost(organizationId, ownerId, {
        businessId: secondBusinessId,
        caption: "Must stop at the daily post cap",
        platforms: ["INSTAGRAM"],
        media: [mediaPath],
      }),
    BusinessUsageLimitError,
  );
  await assert.rejects(
    () =>
      importSocialMediaComments(organizationId, {
        businessId: secondBusinessId,
        platform: "INSTAGRAM",
        postId: "post-cap-test",
      }),
    BusinessUsageLimitError,
  );
  await assert.rejects(
    () =>
      replyToSocialMediaComment(
        organizationId,
        secondBusinessId,
        olderCommentId,
        "This older comment must wait for the daily reset.",
      ),
    BusinessUsageLimitError,
  );
  await assert.rejects(
    () =>
      requestSocialMediaMediaUploadUrl(organizationId, ownerId, {
        businessId: secondBusinessId,
        name: "photo.jpg",
        size: 1024,
        contentType: "image/jpeg",
      }),
    BusinessUsageLimitError,
  );
  assert.equal(
    providerCalls.slice(providerStart).some((call) =>
      ["post", "comment/import", "comment", "upload/from-url"].includes(call.path),
    ),
    false,
  );
  await Promise.all([
    releaseBusinessUsageReservation(postFill.id),
    releaseBusinessUsageReservation(commentFill.id),
    releaseBusinessUsageReservation(mediaFill.id),
  ]);
});

test("registers finalized owner image and video media before publishing to Instagram", async () => {
  const imagePath = `/objects/uploads/image-${runId}`;
  const videoPath = `/objects/uploads/video-${runId}`;
  await addUpload(imagePath, ownerId);
  await addUpload(videoPath, ownerId);
  objectMetadata.set(videoPath, { contentType: "video/mp4", size: "1048576" });

  const post = await createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "Media post",
    platforms: ["INSTAGRAM"],
    media: [imagePath, videoPath],
  });

  assert.equal(post.id, "post-media-test");
  assert.deepEqual(
    providerCalls.map((call) => call.path),
    ["upload/from-url", "upload/from-url", `team/team-${runId}`, "post"],
  );
  assert.equal(providerCalls[3]?.body.teamId, `team-${runId}`);
  const postData = providerCalls[3]?.body.data as Record<string, Record<string, unknown>>;
  assert.deepEqual(
    [...(postData.INSTAGRAM.uploadIds as string[])].sort(),
    ["upload-1", "upload-2"],
  );
  assert.equal(postData.INSTAGRAM.type, "POST");
  assert.deepEqual(deletedObjectPaths, [imagePath, videoPath]);
  const remainingUploads = await db
    .select()
    .from(objectUploadsTable)
    .where(eq(objectUploadsTable.ownerClerkUserId, ownerId));
  assert.equal(remainingUploads.length, 0);
});

test("includes a POST type for both Facebook and Instagram in a combined post", async () => {
  const imagePath = `/objects/uploads/facebook-instagram-${runId}`;
  await addUpload(imagePath, ownerId);
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);

  await createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "Post to both Meta channels",
    platforms: ["FACEBOOK", "INSTAGRAM"],
    media: [imagePath],
  });

  const postCall = providerCalls.find((call) => call.path === "post");
  const postData = postCall?.body.data as Record<string, Record<string, unknown>>;
  assert.deepEqual(postCall?.body.socialAccountTypes, ["FACEBOOK", "INSTAGRAM"]);
  assert.equal(postData.FACEBOOK.type, "POST");
  assert.equal(postData.FACEBOOK.text, "Post to both Meta channels");
  assert.deepEqual(postData.FACEBOOK.uploadIds, ["upload-1"]);
  assert.equal(postData.INSTAGRAM.type, "POST");
  assert.deepEqual(postData.INSTAGRAM.uploadIds, ["upload-1"]);
  const usageAfter = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usageAfter.find((item) => item.metric === "SOCIAL_POSTS")?.used,
    (usageBefore.find((item) => item.metric === "SOCIAL_POSTS")?.used ?? 0) + 2,
  );
  assert.equal(
    usageAfter.find((item) => item.metric === "SOCIAL_POSTS_MONTHLY")?.used,
    (usageBefore.find((item) => item.metric === "SOCIAL_POSTS_MONTHLY")?.used ?? 0) + 2,
  );
});

test("keeps the Threads payload free of Facebook and Instagram fields", async () => {
  await createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "Threads post",
    platforms: ["THREADS"],
  });

  const postCall = providerCalls.find((call) => call.path === "post");
  const postData = postCall?.body.data as Record<string, Record<string, unknown>>;
  assert.equal(postData.THREADS.text, "Threads post");
  assert.equal("type" in postData.THREADS, false);
  assert.equal("uploadIds" in postData.THREADS, false);
});

test("supplies the provider-required title when the internal title is omitted", async () => {
  await createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "  A text-only Facebook update   with extra spacing  ",
    platforms: ["FACEBOOK"],
  });

  const postCall = providerCalls.find((call) => call.path === "post");
  assert.equal(
    postCall?.body.title,
    "A text-only Facebook update with extra spacing",
  );
  assert.equal(postCall?.body.status, "SCHEDULED");
  assert.match(String(postCall?.body.postDate), /^\d{4}-\d{2}-\d{2}T/);
});

test("uses the same fallback title for scheduled text posts", async () => {
  await createSocialMediaPost(organizationId, ownerId, {
    businessId,
    caption: "Scheduled Facebook update",
    platforms: ["FACEBOOK"],
    scheduledAt: new Date(Date.now() + 5 * 60_000),
  });

  const postCall = providerCalls.find((call) => call.path === "post");
  assert.equal(postCall?.body.title, "Scheduled Facebook update");
  assert.equal(postCall?.body.status, "SCHEDULED");
});

test("maps nested provider media validation to a safe owner-facing message", async () => {
  const imagePath = `/objects/uploads/provider-media-error-${runId}`;
  await addUpload(imagePath, ownerId);
  postResponse = {
    status: 400,
    body: {
      errors: [
        {
          field: "data.INSTAGRAM.uploadIds",
          detail: "The image dimensions are unsupported by Instagram.",
        },
      ],
    },
  };

  await assert.rejects(
    () =>
      createSocialMediaPost(organizationId, ownerId, {
        businessId,
        caption: "Media validation failure",
        platforms: ["INSTAGRAM"],
        media: [imagePath],
      }),
    (error: unknown) => {
      assert.ok(error instanceof SocialMediaBadRequestError);
      assert.equal(
        error.message,
        "The social provider rejected the selected media. Use a supported image or video and try again.",
      );
      assert.equal(error.message.includes("dimensions"), false);
      return true;
    },
  );
});

test("uses an isolated provider team for each business in one organization", async () => {
  await addUpload(`/objects/uploads/second-${runId}`, ownerId);

  await createSocialMediaPost(organizationId, ownerId, {
    businessId: secondBusinessId,
    caption: "Second business post",
    platforms: ["INSTAGRAM"],
    media: [`/objects/uploads/second-${runId}`],
  });

  const teamCalls = providerCalls.filter((call) => call.path.startsWith("team/"));
  const postCall = providerCalls.find(
    (call) =>
      call.path === "post" &&
      call.body.teamId === `team-second-${runId}`,
  );
  assert.equal(teamCalls.at(-1)?.path, `team/team-second-${runId}`);
  assert.equal(postCall?.body.teamId, `team-second-${runId}`);
});

test("switching a social account clears the provider authorization and local attachment", async () => {
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);
  const postsUsedBefore =
    usageBefore.find((item) => item.metric === "SOCIAL_POSTS")?.used ?? 0;
  const usageReservation = await reserveBusinessUsage({
    organizationId,
    businessId,
    metric: "SOCIAL_POSTS",
  });
  await completeBusinessUsageReservation(usageReservation.id);

  await disconnectSocialMediaConnection(organizationId, businessId, "FACEBOOK");

  const disconnectCall = providerCalls.find(
    (call) => call.path === "social-account/disconnect",
  );
  assert.equal(disconnectCall?.body.teamId, `team-${runId}`);
  assert.equal(disconnectCall?.body.type, "FACEBOOK");

  const disconnectedAccounts = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(eq(socialMediaAccountsTable.businessId, businessId));
  assert.equal(
    disconnectedAccounts.some((account) => account.platform === "FACEBOOK"),
    false,
  );
  assert.equal(
    disconnectedAccounts.some((account) => account.platform === "INSTAGRAM"),
    true,
  );

  await attachSocialMediaAccount(
    organizationId,
    businessId,
    facebookProviderExternalId,
  );
  const usage = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_POSTS")?.used,
    postsUsedBefore + 1,
    "Meta reconnect must preserve the business usage window and history",
  );

  const remaining = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(eq(socialMediaAccountsTable.businessId, businessId));
  assert.equal(remaining.some((account) => account.platform === "FACEBOOK"), true);
  assert.equal(remaining.some((account) => account.platform === "INSTAGRAM"), true);
});

test("completes Meta Page selection and preserves the selected Page after reload", async () => {
  facebookProviderExternalId = `facebook-page-new-${runId}`;

  const beforeAttach = await getSocialMediaDashboard(organizationId, businessId);
  const availablePage = beforeAttach.availableAccounts.find(
    (account) => account.externalAccountId === `facebook-page-new-${runId}`,
  );
  assert.deepEqual(availablePage, {
    externalAccountId: `facebook-page-new-${runId}`,
    platform: "FACEBOOK",
    displayName: "New Facebook Page",
    username: "new-page",
    profileUrl: null,
    connected: false,
  });

  const attached = await attachSocialMediaAccount(
    organizationId,
    businessId,
    `facebook-page-new-${runId}`,
  );
  assert.equal(attached.platform, "FACEBOOK");
  assert.equal(attached.externalAccountId, `facebook-page-new-${runId}`);
  assert.equal(attached.displayName, "New Facebook Page");

  const setChannelCall = providerCalls.find(
    (call) => call.path === "social-account/set-channel",
  );
  assert.equal(setChannelCall?.body.teamId, `team-${runId}`);
  assert.equal(setChannelCall?.body.channelId, `facebook-page-new-${runId}`);

  const afterReload = await getSocialMediaDashboard(organizationId, businessId);
  const facebookAccount = afterReload.accounts.find(
    (account) => account.platform === "FACEBOOK",
  );
  assert.deepEqual(
    {
      platform: facebookAccount?.platform,
      externalAccountId: facebookAccount?.externalAccountId,
      displayName: facebookAccount?.displayName,
    },
    {
      platform: "FACEBOOK",
      externalAccountId: `facebook-page-new-${runId}`,
      displayName: "New Facebook Page",
    },
  );
  assert.equal(
    afterReload.accounts.some(
      (account) => account.externalAccountId === `facebook-${runId}`,
    ),
    false,
  );
  assert.equal(
    afterReload.availableAccounts.find(
      (account) => account.externalAccountId === `facebook-page-new-${runId}`,
    )?.connected,
    true,
  );
  assert.equal(
    providerCalls.some((call) => call.path === "social-account/unset-channel"),
    false,
  );
});

test("rejects a stale Page without changing the existing local attachment", async () => {
  const beforeAccounts = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(eq(socialMediaAccountsTable.businessId, businessId));
  const existingFacebookAccount = beforeAccounts.find(
    (account) => account.platform === "FACEBOOK",
  );
  providerSocialAccountsOverride = [
    {
      id: `facebook-provider-${runId}`,
      type: "FACEBOOK",
      channels: [],
    },
  ];

  await assert.rejects(
    () =>
      attachSocialMediaAccount(
        organizationId,
        businessId,
        `facebook-page-removed-${runId}`,
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(
        error.message,
        "That Page or account is no longer available. Refresh the available Meta targets and choose again.",
      );
      return true;
    },
  );

  const accounts = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(eq(socialMediaAccountsTable.businessId, businessId));
  assert.equal(
    accounts.find((account) => account.platform === "FACEBOOK")
      ?.externalAccountId,
    existingFacebookAccount?.externalAccountId,
  );
  assert.equal(
    providerCalls.some((call) =>
      ["social-account/set-channel", "social-account/unset-channel"].includes(
        call.path,
      ),
    ),
    false,
  );
});

test("rejects duplicate provider Page ids instead of choosing the first account", async () => {
  providerSocialAccountsOverride = [
    {
      id: `facebook-provider-one-${runId}`,
      type: "FACEBOOK",
      channels: [{ id: `duplicate-page-${runId}`, displayName: "Page One" }],
    },
    {
      id: `facebook-provider-two-${runId}`,
      type: "FACEBOOK",
      channels: [{ id: `duplicate-page-${runId}`, displayName: "Page Two" }],
    },
  ];

  await assert.rejects(
    () =>
      attachSocialMediaAccount(
        organizationId,
        businessId,
        `duplicate-page-${runId}`,
      ),
    (error: unknown) => {
      assert.ok(error instanceof SocialMediaBadRequestError);
      assert.equal(
        error.message,
        "The provider returned more than one Facebook Page with that id. Refresh Meta access and choose again.",
      );
      return true;
    },
  );
  const dashboard = await getSocialMediaDashboard(organizationId, businessId);
  assert.equal(
    dashboard.availableAccounts.some(
      (account) => account.externalAccountId === `duplicate-page-${runId}`,
    ),
    false,
  );
  assert.equal(
    providerCalls.some((call) => call.path === "social-account/set-channel"),
    false,
  );
});

test("ignores incomplete provider targets instead of attaching a malformed Page", async () => {
  providerSocialAccountsOverride = [
    {
      type: "FACEBOOK",
      channels: [{ id: `malformed-page-${runId}`, displayName: "Malformed Page" }],
    },
  ];

  await assert.rejects(
    () =>
      attachSocialMediaAccount(
        organizationId,
        businessId,
        `malformed-page-${runId}`,
      ),
    (error: unknown) => {
      assert.equal(
        (error as Error).message,
        "That Page or account is no longer available. Refresh the available Meta targets and choose again.",
      );
      return true;
    },
  );
});

test("includes the selected social account type when importing comments", async () => {
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);
  const imported = await importSocialMediaComments(organizationId, {
    businessId,
    platform: "INSTAGRAM",
    postId: "post-live-test",
  });

  const commentImportCall = providerCalls.find(
    (call) => call.path === "comment/import",
  );
  assert.equal(commentImportCall?.body.teamId, `team-${runId}`);
  assert.equal(commentImportCall?.body.postId, "post-live-test");
  assert.equal(commentImportCall?.body.socialAccountType, "INSTAGRAM");
  assert.deepEqual(imported, {
    importId: "comment-import-test",
    status: "FETCHING",
  });
  const usageAfter = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usageAfter.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    usageBefore.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used ?? 0,
    "starting a provider import job does not consume a comment unit",
  );
});

test("normalizes provider post channel data for comment imports", async () => {
  postResponse = {
    status: 200,
    body: {
      items: [
        {
          id: "post-with-data-only",
          status: "POSTED",
          data: {
            FACEBOOK: { text: "A Facebook post" },
            INSTAGRAM: { text: "An Instagram post" },
          },
        },
      ],
    },
  };

  const result = await listSocialMediaPosts(organizationId, businessId);

  assert.deepEqual(result.posts[0]?.platforms, ["FACEBOOK", "INSTAGRAM"]);
});

test("keeps the provider fetched-comment id for replies", async () => {
  const result = await listSocialMediaComments(
    organizationId,
    businessId,
    "post-live-test",
  );

  assert.equal(result.comments[0]?.id, "fetched-comment-test");
  assert.equal(result.comments[0]?.externalId, "platform-comment-test");
  assert.equal(result.comments[0]?.canReply, true);
  assert.equal(result.comments[0]?.dailyUnitCountedToday, true);
  const usage = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_IMPORTS")?.used,
    1,
    "the fetched provider comment is counted once toward the monthly allowance",
  );
});

test("charges and settles the business allowance when replying to a social comment", async () => {
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);
  const result = await replyToSocialMediaComment(
    organizationId,
    businessId,
    "fetched-comment-test",
    "Thanks for sharing!",
  );

  assert.equal(result.id, "post-media-test");
  const replyCall = providerCalls.find((call) => call.path === "comment");
  assert.equal(replyCall?.body.teamId, `team-${runId}`);
  assert.equal(replyCall?.body.fetchedParentCommentId, "fetched-comment-test");
  assert.equal(replyCall?.body.text, "Thanks for sharing!");

  const usageAfter = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usageAfter.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    usageBefore.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used ?? 0,
    "a reply shares the daily unit already counted for a same-day import",
  );
  await assert.rejects(
    () =>
      replyToSocialMediaComment(
        organizationId,
        businessId,
        "fetched-comment-test",
        "A second reply should be rejected.",
      ),
    SocialMediaConflictError,
  );
});

test("a reply to a comment imported on an earlier UTC day uses today's unit", async () => {
  const commentId = `older-comment-${runId}`;
  const importedAt = new Date();
  importedAt.setUTCDate(importedAt.getUTCDate() - 1);
  await db.insert(businessSocialCommentsTable).values({
    organizationId,
    businessId,
    providerCommentId: commentId,
    providerPostId: "post-older",
    importedAt,
  });
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);

  await replyToSocialMediaComment(
    organizationId,
    businessId,
    commentId,
    "Thanks for the note.",
  );

  const usageAfter = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    usageAfter.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    (usageBefore.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used ?? 0) + 1,
  );
});

test("only the remaining daily comment units are returned as imported", async () => {
  const fill = await reserveBusinessUsage({
    organizationId,
    businessId: secondBusinessId,
    metric: "SOCIAL_COMMENT_DAILY_UNITS",
    amount: 4,
  });
  await completeBusinessUsageReservation(fill.id);
  commentListOverride = [
    {
      id: `cap-comment-one-${runId}`,
      externalId: `external-cap-comment-one-${runId}`,
      postId: "post-cap-test",
      text: "First available comment",
      authorName: "A customer",
    },
    {
      id: `cap-comment-two-${runId}`,
      externalId: `external-cap-comment-two-${runId}`,
      postId: "post-cap-test",
      text: "This comment exceeds the daily allowance",
      authorName: "Another customer",
    },
  ];

  const result = await listSocialMediaComments(
    organizationId,
    secondBusinessId,
    "post-cap-test",
  );
  const usage = await getBusinessUsageSummary(
    organizationId,
    secondBusinessId,
  );

  assert.deepEqual(
    result.comments.map((comment) => comment.id),
    [`cap-comment-one-${runId}`],
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    5,
  );
  assert.equal(
    usage.find((item) => item.metric === "SOCIAL_COMMENT_IMPORTS")?.used,
    1,
  );
});

test("a same-day reply remains available when its imported comment fills the cap", async () => {
  const usageBefore = await getBusinessUsageSummary(organizationId, businessId);
  const dailyBefore = usageBefore.find(
    (item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS",
  );
  assert.ok(dailyBefore && dailyBefore.remaining >= 2);
  const fill = await reserveBusinessUsage({
    organizationId,
    businessId,
    metric: "SOCIAL_COMMENT_DAILY_UNITS",
    amount: dailyBefore.remaining - 1,
  });
  await completeBusinessUsageReservation(fill.id);

  const commentId = `same-day-cap-comment-${runId}`;
  commentListOverride = [{
    id: commentId,
    externalId: `external-${commentId}`,
    postId: "post-same-day-cap",
    text: "A comment that uses the last unit",
    authorName: "A customer",
  }];
  const imported = await listSocialMediaComments(
    organizationId,
    businessId,
    "post-same-day-cap",
  );
  assert.equal(imported.comments[0]?.dailyUnitCountedToday, true);
  const atCap = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    atCap.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.remaining,
    0,
  );

  await replyToSocialMediaComment(
    organizationId,
    businessId,
    commentId,
    "Thanks for sharing!",
  );
  const afterReply = await getBusinessUsageSummary(organizationId, businessId);
  assert.equal(
    afterReply.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
    atCap.find((item) => item.metric === "SOCIAL_COMMENT_DAILY_UNITS")?.used,
  );
});