import { Router, type IRouter, type Request, type Response } from "express";
import { GetCampaignQrResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CampaignNotFoundError,
  getCampaign,
} from "../services/campaignService";
import {
  ensureCampaignQrLink,
  redirectPathForCode,
} from "../services/redirectService";
import { generateQrAsset, type QrFormat } from "../services/qrService";
import { db, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireOrganization(req: Request, res: Response): string | null {
  const organizationId = req.appUser?.organizationId;
  if (!organizationId) {
    res.status(403).json({
      success: false,
      code: "NO_ORGANIZATION",
      message: "This account is not associated with an organization.",
    });
    return null;
  }
  return organizationId;
}

function param(req: Request, name: string): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

function slugifyFilename(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "qr-code"
  );
}

/** The public origin the QR should encode. Downloads come from the web app
 * through the same proxy, so the forwarded host/proto reflect the user-facing
 * domain in both dev and production — never hardcode a domain here. */
function publicOrigin(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ??
    req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0] ??
    req.headers.host;
  return `${proto}://${host}`;
}

async function loadQrContext(organizationId: string, campaignId: string) {
  const campaign = await getCampaign(organizationId, campaignId);
  const [business] = await db
    .select({ name: businessesTable.name, brandColor: businessesTable.brandColor })
    .from(businessesTable)
    .where(eq(businessesTable.id, campaign.businessId))
    .limit(1);
  const link = await ensureCampaignQrLink(campaign.id);
  return { campaign, business, link };
}

router.get("/campaigns/:id/qr", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const { campaign, business, link } = await loadQrContext(
      organizationId,
      param(req, "id"),
    );
    res.json(
      GetCampaignQrResponse.parse({
        code: link.code,
        redirectPath: redirectPathForCode(link.code),
        campaignId: campaign.id,
        campaignName: campaign.name,
        businessName: business?.name ?? "",
      }),
    );
  } catch (err) {
    if (err instanceof CampaignNotFoundError) {
      res
        .status(404)
        .json({ success: false, code: "NOT_FOUND", message: err.message });
      return;
    }
    throw err;
  }
});

router.get(
  "/campaigns/:id/qr/download/:format",
  requireAuth,
  async (req, res) => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const format = param(req, "format");
    if (format !== "png" && format !== "svg" && format !== "pdf") {
      res.status(400).json({
        success: false,
        code: "INVALID_FORMAT",
        message: "format must be one of: png, svg, pdf",
      });
      return;
    }

    try {
      const { campaign, business, link } = await loadQrContext(
        organizationId,
        param(req, "id"),
      );
      const url = `${publicOrigin(req)}${redirectPathForCode(link.code)}`;
      const asset = await generateQrAsset(format as QrFormat, {
        url,
        businessName: business?.name ?? "",
        campaignName: campaign.name,
        brandColor: business?.brandColor ?? null,
      });

      const filename = `${slugifyFilename(campaign.name)}-qr.${asset.extension}`;
      res.setHeader("Content-Type", asset.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(asset.body);
    } catch (err) {
      if (err instanceof CampaignNotFoundError) {
        res
          .status(404)
          .json({ success: false, code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  },
);

export default router;
