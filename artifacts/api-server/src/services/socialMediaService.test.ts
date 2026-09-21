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
} from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  createSocialMediaPost,
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
let providerCalls: Array<{ path: string; body: Record<string, unknown> }> = [];
const originalFetch = globalThis.fetch;
const originalGetObject = ObjectStorageService.prototype.getObjectEntityFile;

const objectMetadata = new Map<
  string,
  { contentType: string; size: string }
>();

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
    if (path === "upload/from-url") {
      return new Response(JSON.stringify({ id: `upload-${providerCalls.length}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
  await db.insert(providerConnectionsTable).values({
    organizationId,
    provider: "BNDLE",
    externalProfileId: `team-${runId}`,
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
});

beforeEach(async () => {
  providerCalls = [];
  objectMetadata.clear();
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
  const oversizedPath = `/objects/uploads/oversized-${runId}`;
  await addUpload(unsupportedPath, ownerId);
  await addUpload(oversizedPath, ownerId);
  objectMetadata.set(unsupportedPath, {
    contentType: "application/pdf",
    size: "1024",
  });
  objectMetadata.set(oversizedPath, {
    contentType: "image/jpeg",
    size: String(25 * 1024 * 1024 + 1),
  });

  for (const objectPath of [unsupportedPath, oversizedPath]) {
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
    ["upload/from-url", "upload/from-url", "post"],
  );
  const postData = providerCalls[2]?.body.data as Record<string, Record<string, unknown>>;
  assert.deepEqual(postData.INSTAGRAM.uploadIds, ["upload-1", "upload-2"]);
});