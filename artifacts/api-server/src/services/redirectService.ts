import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  campaignsTable,
  redirectLinksTable,
  type RedirectLink,
} from "@workspace/db";
import { logScanEvent, type RequestMeta } from "./scanEventService";

export class RedirectNotFoundError extends Error {
  constructor(code: string) {
    super(`No active redirect for code ${code}`);
    this.name = "RedirectNotFoundError";
  }
}

const CODE_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 10;

/** Unbiased base-62 short code. 62^10 ≈ 8.4e17 — collision odds are
 * negligible, but the unique index on redirect_links.code is the backstop. */
function generateCode(): string {
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(16)) {
      // Reject bytes outside the largest multiple of 62 to avoid modulo bias.
      if (byte >= 248) continue;
      out += CODE_ALPHABET[byte % 62];
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

export function redirectPathForCode(code: string): string {
  return `/r/${code}`;
}

/** Returns the campaign's QR redirect link, creating it on first request.
 * One QR link per campaign; the printed QR never needs regenerating because
 * resolution happens at scan time. */
export async function ensureCampaignQrLink(
  campaignId: string,
): Promise<RedirectLink> {
  // The partial unique index (one QR link per campaign) makes this safe under
  // concurrency: losers of the insert race fall through to the re-select.
  // A code collision (astronomically rare) also lands in the retry loop.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [existing] = await db
      .select()
      .from(redirectLinksTable)
      .where(
        and(
          eq(redirectLinksTable.campaignId, campaignId),
          eq(redirectLinksTable.sourceType, "QR"),
        ),
      )
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(redirectLinksTable)
      .values({ code: generateCode(), sourceType: "QR", campaignId })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
  }
  throw new Error(`Failed to create QR link for campaign ${campaignId}`);
}

export function isLiveRedirect(input: {
  linkActive: boolean;
  campaignStatus: string;
  businessStatus: string;
  campaignDeletedAt?: Date | null;
  campaignArchivedAt?: Date | null;
  businessDeletedAt?: Date | null;
  businessArchivedAt?: Date | null;
}): boolean {
  return (
    input.linkActive &&
    input.campaignStatus === "ACTIVE" &&
    input.businessStatus === "ACTIVE" &&
    !input.campaignDeletedAt &&
    !input.campaignArchivedAt &&
    !input.businessDeletedAt &&
    !input.businessArchivedAt
  );
}

/** Resolves a short code to its review page path and logs the scan event.
 * Failures (paused campaign, disabled device/link) are still logged with
 * redirectSuccess=false so owners can see demand on a paused surface. */
export async function resolveRedirect(
  code: string,
  meta: RequestMeta,
): Promise<{ targetPath: string }> {
  const [row] = await db
    .select({
      link: redirectLinksTable,
      campaign: campaignsTable,
      business: businessesTable,
    })
    .from(redirectLinksTable)
    .innerJoin(
      campaignsTable,
      eq(redirectLinksTable.campaignId, campaignsTable.id),
    )
    .innerJoin(
      businessesTable,
      eq(campaignsTable.businessId, businessesTable.id),
    )
    .where(
      and(eq(redirectLinksTable.code, code)),
    )
    .limit(1);

  if (!row) throw new RedirectNotFoundError(code);

  const { link, campaign, business } = row;

  const success = isLiveRedirect({
    linkActive: link.active,
    campaignStatus: campaign.status,
    businessStatus: business.status,
    campaignDeletedAt: campaign.deletedAt,
    campaignArchivedAt: campaign.archivedAt,
    businessDeletedAt: business.deletedAt,
    businessArchivedAt: business.archivedAt,
  });

  await logScanEvent({
    eventType: "QR_SCAN",
    organizationId: business.organizationId,
    businessId: business.id,
    businessName: business.name,
    campaignId: campaign.id,
    campaignName: campaign.name,
    redirectLinkId: link.id,
    redirectSuccess: success,
    meta,
  });

  if (!success) throw new RedirectNotFoundError(code);
  return { targetPath: `/review/${business.slug}/${campaign.slug}` };
}
