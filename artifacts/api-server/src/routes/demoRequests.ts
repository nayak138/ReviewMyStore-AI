import { Router, type IRouter } from "express";
import {
  CreateDemoRequestBody,
  CreateDemoRequestResponse,
  ListDemoRequestsResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  createDemoRequest,
  listDemoRequests,
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

export default router;
