import { Router, type IRouter } from "express";
import {
  CreateDemoRequestBody,
  CreateDemoRequestResponse,
  ListDemoRequestsResponse,
  SetDemoRequestStatusBody,
  SetDemoRequestStatusParams,
  SetDemoRequestStatusResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  createDemoRequest,
  listDemoRequests,
  updateDemoRequest,
} from "../services/demoRequestService";

const router: IRouter = Router();

// Public (unauthenticated): marketing-site "Book a Demo" lead capture.
router.post("/public/demo-requests", async (req, res) => {
  const parsed = CreateDemoRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }
  const result = await createDemoRequest(parsed.data);
  res.status(201).json(CreateDemoRequestResponse.parse(result));
});

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

export default router;
