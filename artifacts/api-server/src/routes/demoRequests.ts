import { Router, type IRouter } from "express";
import {
  CreateDemoRequestBody,
  CreateDemoRequestResponse,
  ListDemoRequestsResponse,
  ResendDemoRequestAlertParams,
  ResendDemoRequestAlertResponse,
  SetDemoRequestStatusBody,
  SetDemoRequestStatusParams,
  SetDemoRequestStatusResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";
import {
  createDemoRequest,
  DemoRequestAlertResendUnavailableError,
  DemoRequestNotFoundError,
  listDemoRequests,
  resendDemoRequestAlert,
  updateDemoRequest,
} from "../services/demoRequestService";

const router: IRouter = Router();

// Public (unauthenticated): marketing-site "Book a Demo" lead capture.
// Abuse protection: per-IP rate limit + honeypot field.
router.post(
  "/public/demo-requests",
  rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }),
  async (req, res) => {
    const parsed = CreateDemoRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }
    const { website, ...data } = parsed.data;
    if (website) {
      // Honeypot tripped: a hidden field only bots fill in. Pretend success
      // so the bot learns nothing, but don't persist the lead.
      req.log.warn("demo request honeypot tripped");
      res.status(201).json(CreateDemoRequestResponse.parse({ id: "ok" }));
      return;
    }
    const result = await createDemoRequest(data);
    res.status(201).json(CreateDemoRequestResponse.parse(result));
  },
);

router.get(
  "/admin/demo-requests",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (_req, res) => {
    const result = await listDemoRequests();
    res.json(ListDemoRequestsResponse.parse(result));
  },
);

router.patch(
  "/admin/demo-requests/:id/status",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    const parsed = SetDemoRequestStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }
    const params = SetDemoRequestStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: params.error.message,
      });
      return;
    }
    if (
      parsed.data.status === undefined &&
      parsed.data.notes === undefined
    ) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: "Provide status and/or notes",
      });
      return;
    }
    const updated = await updateDemoRequest(params.data.id, parsed.data);
    if (!updated) {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Demo request not found",
      });
      return;
    }
    res.json(SetDemoRequestStatusResponse.parse(updated));
  },
);

router.post(
  "/admin/demo-requests/:id/resend-alert",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res): Promise<void> => {
    const params = ResendDemoRequestAlertParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: params.error.message,
      });
      return;
    }
    try {
      const result = await resendDemoRequestAlert(params.data.id);
      res.json(ResendDemoRequestAlertResponse.parse(result));
    } catch (error) {
      if (error instanceof DemoRequestNotFoundError) {
        res.status(404).json({ success: false, code: "NOT_FOUND", message: error.message });
        return;
      }
      if (error instanceof DemoRequestAlertResendUnavailableError) {
        res.status(409).json({ success: false, code: "RESEND_UNAVAILABLE", message: error.message });
        return;
      }
      throw error;
    }
  },
);

export default router;
