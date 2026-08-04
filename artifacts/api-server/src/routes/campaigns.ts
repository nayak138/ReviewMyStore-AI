import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateCampaignBody,
  CreateCampaignResponse,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  SetCampaignStatusBody,
  GetCampaignResponse,
  ArchiveCampaignResponse,
  RestoreCampaignResponse,
  ListCampaignsResponse,
  ListCampaignTemplatesResponse,
  CreateKeywordBody,
  CreateKeywordResponse,
  UpdateKeywordBody,
  UpdateKeywordResponse,
  ListKeywordsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { BusinessNotFoundError } from "../services/businessService";
import {
  CampaignNotFoundError,
  archiveCampaign,
  createCampaign,
  getCampaign,
  listCampaigns,
  restoreCampaign,
  setCampaignStatus,
  softDeleteCampaign,
  updateCampaign,
} from "../services/campaignService";
import {
  KeywordNotFoundError,
  createKeyword,
  deleteKeyword,
  listKeywords,
  updateKeyword,
} from "../services/keywordService";
import { CAMPAIGN_TEMPLATES } from "../data/campaignTemplates";

const router: IRouter = Router();

/** Mirrors businesses.ts: Super Admins have no organization and get 403 —
 * campaign management is a tenant concern, not a platform one. */
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

function notFound(res: Response, err: Error) {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: err.message,
  });
}

router.get("/campaign-templates", requireAuth, async (_req, res) => {
  res.json(ListCampaignTemplatesResponse.parse({ templates: CAMPAIGN_TEMPLATES }));
});

router.get("/campaigns", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const businessId =
    typeof req.query.businessId === "string" ? req.query.businessId : "";
  if (!businessId) {
    res.status(400).json({
      success: false,
      code: "INVALID_QUERY",
      message: "The 'businessId' query parameter is required.",
    });
    return;
  }

  const includeArchived = req.query.includeArchived !== "false";
  try {
    const campaigns = await listCampaigns(
      organizationId,
      businessId,
      includeArchived,
    );
    res.json(ListCampaignsResponse.parse({ campaigns }));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.post("/campaigns", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  const { businessId, ...campaignInput } = parsed.data;
  try {
    const campaign = await createCampaign(
      organizationId,
      businessId,
      campaignInput,
    );
    res.status(201).json(CreateCampaignResponse.parse(campaign));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.get("/campaigns/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const campaign = await getCampaign(organizationId, param(req, "id"));
    res.json(GetCampaignResponse.parse(campaign));
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.patch("/campaigns/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const campaign = await updateCampaign(
      organizationId,
      param(req, "id"),
      parsed.data,
    );
    res.json(UpdateCampaignResponse.parse(campaign));
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.delete("/campaigns/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    await softDeleteCampaign(organizationId, param(req, "id"));
    res.status(204).send();
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.post("/campaigns/:id/archive", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const campaign = await archiveCampaign(organizationId, param(req, "id"));
    res.json(ArchiveCampaignResponse.parse(campaign));
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.post("/campaigns/:id/restore", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const campaign = await restoreCampaign(organizationId, param(req, "id"));
    res.json(RestoreCampaignResponse.parse(campaign));
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.patch("/campaigns/:id/status", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = SetCampaignStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const campaign = await setCampaignStatus(
      organizationId,
      param(req, "id"),
      parsed.data.status,
    );
    res.json(campaign);
  } catch (err) {
    if (err instanceof CampaignNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.get(
  "/campaigns/:campaignId/keywords",
  requireAuth,
  async (req, res) => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    try {
      const keywords = await listKeywords(
        organizationId,
        param(req, "campaignId"),
      );
      res.json(ListKeywordsResponse.parse({ keywords }));
    } catch (err) {
      if (err instanceof CampaignNotFoundError) return notFound(res, err);
      throw err;
    }
  },
);

router.post(
  "/campaigns/:campaignId/keywords",
  requireAuth,
  async (req, res) => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const parsed = CreateKeywordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }

    try {
      const keyword = await createKeyword(
        organizationId,
        param(req, "campaignId"),
        parsed.data,
      );
      res.status(201).json(CreateKeywordResponse.parse(keyword));
    } catch (err) {
      if (err instanceof CampaignNotFoundError) return notFound(res, err);
      throw err;
    }
  },
);

router.patch("/keywords/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = UpdateKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const keyword = await updateKeyword(
      organizationId,
      param(req, "id"),
      parsed.data,
    );
    res.json(UpdateKeywordResponse.parse(keyword));
  } catch (err) {
    if (err instanceof KeywordNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.delete("/keywords/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    await deleteKeyword(organizationId, param(req, "id"));
    res.status(204).send();
  } catch (err) {
    if (err instanceof KeywordNotFoundError) return notFound(res, err);
    throw err;
  }
});

export default router;
