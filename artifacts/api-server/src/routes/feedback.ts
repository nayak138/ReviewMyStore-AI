import { Router, type IRouter, type Request, type Response } from "express";
import {
  ListPrivateFeedbackQueryParams,
  ListPrivateFeedbackResponse,
  UpdatePrivateFeedbackStatusBody,
  UpdatePrivateFeedbackStatusResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  FeedbackNotFoundError,
  listPrivateFeedbackForUser,
  updatePrivateFeedbackStatus,
} from "../services/privateFeedbackService";
import {
  BusinessAccessDeniedError,
  BusinessResourceNotFoundError,
  requireFeedbackAccess,
} from "../services/businessAccessService";

const router: IRouter = Router();

/** Same tenant-isolation pattern as businesses.ts: always scope by
 * req.appUser.organizationId, never a client-supplied id. */
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

router.get("/feedback", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = ListPrivateFeedbackQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_QUERY",
      message: parsed.error.message,
    });
    return;
  }

  const feedback = await listPrivateFeedbackForUser(req.appUser!, parsed.data);
  res.json(ListPrivateFeedbackResponse.parse({ feedback }));
});

router.patch("/feedback/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = UpdatePrivateFeedbackStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    await requireFeedbackAccess(req.appUser!, idParam(req), "MANAGE");
    const updated = await updatePrivateFeedbackStatus(
      organizationId,
      idParam(req),
      parsed.data.status,
    );
    res.json(UpdatePrivateFeedbackStatusResponse.parse(updated));
  } catch (err) {
    if (err instanceof FeedbackNotFoundError) {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: err.message,
      });
      return;
    }
    if (err instanceof BusinessAccessDeniedError) {
      res.status(403).json({ success: false, code: "FORBIDDEN", message: err.message });
      return;
    }
    if (err instanceof BusinessResourceNotFoundError) {
      res.status(404).json({ success: false, code: "NOT_FOUND", message: err.message });
      return;
    }
    throw err;
  }
});

export default router;
