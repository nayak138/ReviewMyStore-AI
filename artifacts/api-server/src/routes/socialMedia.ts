import { Router, type IRouter, type Request, type Response } from "express";
import {
  AttachSocialMediaAccountBody,
  AttachSocialMediaAccountResponse,
  CreateSocialMediaPostBody,
  CreateSocialMediaPostResponse,
  GetSocialMediaDashboardQueryParams,
  GetSocialMediaDashboardResponse,
  ImportSocialMediaCommentsBody,
  ImportSocialMediaCommentsResponse,
  ListSocialMediaCommentsQueryParams,
  ListSocialMediaCommentsResponse,
  ListSocialMediaPostsQueryParams,
  ListSocialMediaPostsResponse,
  ReplyToSocialMediaCommentBody,
  ReplyToSocialMediaCommentParams,
  ReplyToSocialMediaCommentResponse,
  SocialMediaAccount,
  SocialMediaPost,
  StartSocialMediaConnectionBody,
  StartSocialMediaConnectionResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  attachSocialMediaAccount,
  createSocialMediaPost,
  detachSocialMediaAccount,
  getSocialMediaDashboard,
  importSocialMediaComments,
  listSocialMediaComments,
  listSocialMediaPosts,
  replyToSocialMediaComment,
  SocialMediaBadRequestError,
  SocialMediaConflictError,
  SocialMediaNotFoundError,
  startSocialMediaConnection,
} from "../services/socialMediaService";

const router: IRouter = Router();

function requireOrganization(req: Request, res: Response): string | null {
  const organizationId = req.appUser?.organizationId;
  if (!organizationId) {
    res.status(403).json({
      success: false,
      code: "NO_ORGANIZATION",
      message: "Your account is not associated with an organization.",
    });
    return null;
  }
  return organizationId;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof SocialMediaBadRequestError) {
    res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: error.message,
    });
    return;
  }
  if (error instanceof SocialMediaConflictError) {
    res.status(409).json({
      success: false,
      code: "SOCIAL_ACCOUNT_ALREADY_ATTACHED",
      message: error.message,
    });
    return;
  }
  if (error instanceof SocialMediaNotFoundError) {
    res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: error.message,
    });
    return;
  }
  throw error;
}

function requireBusinessQuery(
  req: Request,
  res: Response,
  schema: { safeParse: (input: unknown) => any },
) {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_QUERY",
      message: parsed.error.message,
    });
    return null;
  }
  return parsed.data.businessId;
}

router.get(
  "/social-media/dashboard",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = requireBusinessQuery(
      req,
      res,
      GetSocialMediaDashboardQueryParams,
    );
    if (!businessId) return;
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await getSocialMediaDashboard(
        organizationId,
        businessId,
      );
      res.json(GetSocialMediaDashboardResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to load social media dashboard");
      sendError(res, error);
    }
  },
);

router.post(
  "/social-media/connection",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = StartSocialMediaConnectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await startSocialMediaConnection(
        organizationId,
        parsed.data.businessId,
        parsed.data.platform,
      );
      res.json(StartSocialMediaConnectionResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to start social media connection");
      sendError(res, error);
    }
  },
);

router.post(
  "/social-media/accounts/attach",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = AttachSocialMediaAccountBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await attachSocialMediaAccount(
        organizationId,
        parsed.data.businessId,
        parsed.data.externalAccountId,
      );
      res.json(AttachSocialMediaAccountResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to attach social media account");
      sendError(res, error);
    }
  },
);

router.delete(
  "/social-media/accounts/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      await detachSocialMediaAccount(
        organizationId,
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
      );
      res.status(204).send();
    } catch (error) {
      req.log.warn({ err: error }, "Unable to detach social media account");
      sendError(res, error);
    }
  },
);

router.get(
  "/social-media/posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = requireBusinessQuery(
      req,
      res,
      ListSocialMediaPostsQueryParams,
    );
    if (!businessId) return;
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await listSocialMediaPosts(
        organizationId,
        businessId,
      );
      res.json(ListSocialMediaPostsResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to list social media posts");
      sendError(res, error);
    }
  },
);

router.post(
  "/social-media/posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateSocialMediaPostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await createSocialMediaPost(
        organizationId,
        parsed.data,
      );
      res.status(201).json(CreateSocialMediaPostResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to create social media post");
      sendError(res, error);
    }
  },
);

router.get(
  "/social-media/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = requireBusinessQuery(
      req,
      res,
      ListSocialMediaCommentsQueryParams,
    );
    if (!businessId) return;
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await listSocialMediaComments(
        organizationId,
        businessId,
        typeof req.query.postId === "string" ? req.query.postId : undefined,
      );
      res.json(ListSocialMediaCommentsResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to list social media comments");
      sendError(res, error);
    }
  },
);

router.post(
  "/social-media/comments",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = ImportSocialMediaCommentsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await importSocialMediaComments(
        organizationId,
        parsed.data,
      );
      res.status(202).json(ImportSocialMediaCommentsResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to import social media comments");
      sendError(res, error);
    }
  },
);

router.post(
  "/social-media/comments/:id/reply",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ReplyToSocialMediaCommentParams.safeParse(req.params);
    const body = ReplyToSocialMediaCommentBody.safeParse(req.body);
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
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    try {
      const result = await replyToSocialMediaComment(
        organizationId,
        body.data.businessId,
        params.data.id,
        body.data.text,
      );
      res.json(ReplyToSocialMediaCommentResponse.parse(result));
    } catch (error) {
      req.log.warn({ err: error }, "Unable to reply to social media comment");
      sendError(res, error);
    }
  },
);

export default router;