import { Router, type IRouter, type Request, type Response } from "express";
import {
  DeleteManagedReviewReplyParams,
  DeleteManagedReviewReplyResponse,
  DisconnectReviewProviderQueryParams,
  GenerateManagedReviewDraftParams,
  GenerateManagedReviewDraftResponse,
  GetReviewDashboardResponse,
  GetReviewDashboardQueryParams,
  GetReviewProviderLocationsQueryParams,
  GetReviewProviderLocationsResponse,
  ListManagedReviewsQueryParams,
  ListManagedReviewsResponse,
  PublishManagedReviewReplyBody,
  PublishManagedReviewReplyParams,
  PublishManagedReviewReplyResponse,
  SelectReviewProviderLocationBody,
  SelectReviewProviderLocationResponse,
  StartReviewProviderConnectionBody,
  StartReviewProviderConnectionResponse,
  SyncReviewProviderResponse,
  SyncReviewProviderQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  deleteManagedReviewReply,
  disconnectReviewProvider,
  generateManagedReviewDraft,
  getReviewDashboard,
  getReviewProviderConnectionLocations,
  listManagedReviews,
  ManagedReviewNotFoundError,
  publishManagedReviewReply,
  ReviewProviderError,
  ReviewProviderOperationInProgressError,
  assertReviewBusiness,
  selectReviewProviderLocation,
  startReviewProviderConnection,
  syncReviewProvider,
  syncReviewProviderForBusiness,
} from "../services/reviewManagementService";
import { BusinessUsageLimitError } from "../services/businessUsageService";
import { publicOrigin } from "../lib/publicOrigin";
import {
  BusinessAccessDeniedError,
  BusinessResourceNotFoundError,
  requireBusinessAccess,
  requireOwner,
  requireReviewAccess,
} from "../services/businessAccessService";

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

function sendServiceError(res: Response, error: unknown) {
  if (error instanceof ManagedReviewNotFoundError) {
    res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: error.message,
    });
    return;
  }
  if (error instanceof ReviewProviderError) {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  if (error instanceof ReviewProviderOperationInProgressError) {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  if (error instanceof BusinessUsageLimitError) {
    res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  if (error instanceof BusinessAccessDeniedError) {
    res.status(403).json({ success: false, code: "FORBIDDEN", message: error.message });
    return;
  }
  if (error instanceof BusinessResourceNotFoundError) {
    res.status(404).json({ success: false, code: "NOT_FOUND", message: error.message });
    return;
  }
  throw error;
}

router.get(
  "/review-management",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const businessId =
      typeof req.query.businessId === "string" ? req.query.businessId : undefined;
    const parsed = businessId
      ? GetReviewDashboardQueryParams.safeParse(req.query)
      : null;
    if (parsed && !parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_QUERY",
        message: parsed.error.message,
      });
      return;
    }
    if (parsed?.data.businessId) {
      try {
        await requireBusinessAccess(req.appUser!, parsed.data.businessId, "reviewInbox", "VIEW");
      } catch (error) {
        sendServiceError(res, error);
        return;
      }
    } else if (req.appUser!.role !== "OWNER") {
      res.status(403).json({ success: false, code: "FORBIDDEN", message: "Choose an assigned business to view reviews." });
      return;
    }
    const dashboard = await getReviewDashboard(
      organizationId,
      parsed?.data.businessId,
    );
    res.json(GetReviewDashboardResponse.parse(dashboard));
  },
);

router.post(
  "/review-management/connection",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const body = StartReviewProviderConnectionBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: body.error.message,
      });
      return;
    }
    try {
      await requireOwner(req.appUser!);
      await assertReviewBusiness(organizationId, body.data.businessId);
      const result = await startReviewProviderConnection(
        organizationId,
        publicOrigin(req),
        body.data.businessId,
      );
      res.json(StartReviewProviderConnectionResponse.parse(result));
    } catch (error) {
      req.log.warn(
        { err: error },
        "Unable to start review provider connection",
      );
      sendServiceError(res, error);
    }
  },
);

router.get(
  "/review-management/connection/locations",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      await requireOwner(req.appUser!);
      const parsed = GetReviewProviderLocationsQueryParams.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: "INVALID_QUERY",
          message: parsed.error.message,
        });
        return;
      }
      const result = await getReviewProviderConnectionLocations(
        organizationId,
        parsed.data.businessId,
      );
      res.json(GetReviewProviderLocationsResponse.parse(result));
    } catch (error) {
      req.log.warn(
        { err: error },
        "Unable to check review provider connection",
      );
      sendServiceError(res, error);
    }
  },
);

router.post(
  "/review-management/connection/location",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const body = SelectReviewProviderLocationBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: body.error.message,
      });
      return;
    }
    try {
      await requireOwner(req.appUser!);
      const result = await selectReviewProviderLocation(
        organizationId,
        body.data.businessId,
        body.data.locationId,
      );
      res.json(SelectReviewProviderLocationResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to select review provider location");
      sendServiceError(res, error);
    }
  },
);

router.delete(
  "/review-management/connection",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const parsed = DisconnectReviewProviderQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_QUERY",
        message: parsed.error.message,
      });
      return;
    }
    try {
      await requireOwner(req.appUser!);
      const result = await disconnectReviewProvider(
        organizationId,
        parsed.data.businessId,
      );
      res.json(GetReviewDashboardResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to disconnect review provider");
      sendServiceError(res, error);
    }
  },
);

router.post(
  "/review-management/sync",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const businessId =
      typeof req.query.businessId === "string" ? req.query.businessId : undefined;
    const parsed = businessId
      ? SyncReviewProviderQueryParams.safeParse(req.query)
      : null;
    if (parsed && !parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_QUERY",
        message: parsed.error.message,
      });
      return;
    }
    try {
      await requireOwner(req.appUser!);
      const result = businessId
        ? await syncReviewProviderForBusiness(organizationId, businessId)
        : await syncReviewProvider(organizationId);
      res.json(SyncReviewProviderResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Review provider sync failed");
      sendServiceError(res, error);
    }
  },
);

router.get(
  "/review-management/reviews",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const parsed = ListManagedReviewsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_QUERY",
        message: parsed.error.message,
      });
      return;
    }
    if (parsed.data.businessId) {
      try {
        await requireBusinessAccess(req.appUser!, parsed.data.businessId, "reviewInbox", "VIEW");
      } catch (error) {
        sendServiceError(res, error);
        return;
      }
    } else if (req.appUser!.role !== "OWNER") {
      res.status(403).json({ success: false, code: "FORBIDDEN", message: "Choose an assigned business to view reviews." });
      return;
    }
    const result = await listManagedReviews(organizationId, parsed.data);
    res.json(ListManagedReviewsResponse.parse(result));
  },
);

router.post(
  "/review-management/reviews/:id/draft",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const params = GenerateManagedReviewDraftParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: params.error.message,
      });
      return;
    }
    try {
      await requireReviewAccess(req.appUser!, params.data.id, "MANAGE");
      const result = await generateManagedReviewDraft(
        organizationId,
        req.appUser!.id,
        params.data.id,
      );
      res.json(GenerateManagedReviewDraftResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Review reply draft generation failed");
      sendServiceError(res, error);
    }
  },
);

router.post(
  "/review-management/reviews/:id/reply",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const params = PublishManagedReviewReplyParams.safeParse(req.params);
    const body = PublishManagedReviewReplyBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: !params.success
          ? params.error.message
          : (body.error?.message ?? "Invalid request body."),
      });
      return;
    }
    try {
      await requireReviewAccess(req.appUser!, params.data.id, "MANAGE");
      const result = await publishManagedReviewReply(
        organizationId,
        req.appUser!.id,
        params.data.id,
        body.data.comment,
      );
      res.json(PublishManagedReviewReplyResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Review reply publish failed");
      sendServiceError(res, error);
    }
  },
);

router.delete(
  "/review-management/reviews/:id/reply",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    const params = DeleteManagedReviewReplyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: params.error.message,
      });
      return;
    }
    try {
      await requireReviewAccess(req.appUser!, params.data.id, "MANAGE");
      const result = await deleteManagedReviewReply(
        organizationId,
        req.appUser!.id,
        params.data.id,
      );
      res.json(DeleteManagedReviewReplyResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Review reply delete failed");
      sendServiceError(res, error);
    }
  },
);

export default router;
