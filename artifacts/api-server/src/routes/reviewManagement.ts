import { Router, type IRouter, type Request, type Response } from "express";
import {
  DeleteManagedReviewReplyParams,
  DeleteManagedReviewReplyResponse,
  GenerateManagedReviewDraftParams,
  GenerateManagedReviewDraftResponse,
  GetReviewDashboardResponse,
  GetReviewProviderLocationsResponse,
  ListManagedReviewsQueryParams,
  ListManagedReviewsResponse,
  PublishManagedReviewReplyBody,
  PublishManagedReviewReplyParams,
  PublishManagedReviewReplyResponse,
  SelectReviewProviderLocationBody,
  SelectReviewProviderLocationResponse,
  StartReviewProviderConnectionResponse,
  SyncReviewProviderResponse,
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
  selectReviewProviderLocation,
  startReviewProviderConnection,
  syncReviewProvider,
} from "../services/reviewManagementService";

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
  throw error;
}

router.get("/review-management", requireAuth, async (req, res): Promise<void> => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;
  const dashboard = await getReviewDashboard(organizationId);
  res.json(GetReviewDashboardResponse.parse(dashboard));
});

router.post(
  "/review-management/connection",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await startReviewProviderConnection(organizationId);
      res.json(StartReviewProviderConnectionResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to start review provider connection");
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
      const result = await getReviewProviderConnectionLocations(organizationId);
      res.json(GetReviewProviderLocationsResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to check review provider connection");
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
      const result = await selectReviewProviderLocation(
        organizationId,
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
    try {
      const result = await disconnectReviewProvider(organizationId);
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
    try {
      const result = await syncReviewProvider(organizationId);
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
          : body.error?.message ?? "Invalid request body.",
      });
      return;
    }
    try {
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