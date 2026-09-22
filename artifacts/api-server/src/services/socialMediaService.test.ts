import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  businessesTable,
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
  createSocialMediaPost,
  disconnectSocialMediaConnection,
  importSocialMediaComments,
  listSocialMediaComments,
  listSocialMediaPosts,
  SocialMediaBadRequestError,
} from "./socialMediaService";

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
const originalFetch = globalThis.fetch;
const originalGetObject = ObjectStorageService.prototype.getObjectEntityFile;

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
          socialAccounts: [
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
                : `facebook-${runId}`,
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
          items: [
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
  assert.deepEqual(postData.INSTAGRAM.uploadIds, ["upload-1", "upload-2"]);
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
  await disconnectSocialMediaConnection(organizationId, businessId, "FACEBOOK");

  const disconnectCall = providerCalls.find(
    (call) => call.path === "social-account/disconnect",
  );
  assert.equal(disconnectCall?.body.teamId, `team-${runId}`);
  assert.equal(disconnectCall?.body.type, "FACEBOOK");

  const remaining = await db
    .select()
    .from(socialMediaAccountsTable)
    .where(eq(socialMediaAccountsTable.businessId, businessId));
  assert.equal(remaining.some((account) => account.platform === "FACEBOOK"), false);
  assert.equal(remaining.some((account) => account.platform === "INSTAGRAM"), true);
});

test("includes the selected social account type when importing comments", async () => {
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
});