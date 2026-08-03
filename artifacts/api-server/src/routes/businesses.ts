import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateBusinessBody,
  CreateBusinessResponse,
  UpdateBusinessBody,
  UpdateBusinessResponse,
  SetBusinessStatusBody,
  SetBusinessStatusResponse,
  GetBusinessResponse,
  ArchiveBusinessResponse,
  RestoreBusinessResponse,
  ListBusinessesResponse,
  GetDashboardSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  BusinessNotFoundError,
  archiveBusiness,
  createBusiness,
  generateUniqueBusinessSlug,
  getBusiness,
  listBusinesses,
  restoreBusiness,
  setBusinessStatus,
  softDeleteBusiness,
  updateBusiness,
} from "../services/businessService";
import { getDashboardSummary } from "../services/dashboardService";

const router: IRouter = Router();

/** Every route here requires auth and is scoped to req.appUser.organizationId
 * (never a client-supplied org id) so RBAC/tenant isolation can't be bypassed
 * by request tampering. Super Admins have no organization and get 403 here —
 * business management is an Owner/tenant concern, not a platform one. */
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

function idParam(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

function notFound(res: Response, err: BusinessNotFoundError) {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: err.message,
  });
}

router.get("/businesses", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const includeArchived = req.query.includeArchived !== "false";
  const businesses = await listBusinesses(organizationId, includeArchived);
  res.json(ListBusinessesResponse.parse({ businesses }));
});

router.post("/businesses", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  const slug = await generateUniqueBusinessSlug(parsed.data.slug);
  const business = await createBusiness(organizationId, {
    ...parsed.data,
    slug,
  });
  res.status(201).json(CreateBusinessResponse.parse(business));
});

router.get("/businesses/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const business = await getBusiness(organizationId, idParam(req));
    res.json(GetBusinessResponse.parse(business));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.patch("/businesses/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const business = await updateBusiness(
      organizationId,
      idParam(req),
      parsed.data,
    );
    res.json(UpdateBusinessResponse.parse(business));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.delete("/businesses/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    await softDeleteBusiness(organizationId, idParam(req));
    res.status(204).send();
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.post("/businesses/:id/archive", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const business = await archiveBusiness(organizationId, idParam(req));
    res.json(ArchiveBusinessResponse.parse(business));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.post("/businesses/:id/restore", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const business = await restoreBusiness(organizationId, idParam(req));
    res.json(RestoreBusinessResponse.parse(business));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.patch("/businesses/:id/status", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = SetBusinessStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const business = await setBusinessStatus(
      organizationId,
      idParam(req),
      parsed.data.status,
    );
    res.json(SetBusinessStatusResponse.parse(business));
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return notFound(res, err);
    throw err;
  }
});

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const summary = await getDashboardSummary(organizationId);
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
