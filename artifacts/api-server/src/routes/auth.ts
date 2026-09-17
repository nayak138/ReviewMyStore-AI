import { Router, type IRouter } from "express";
import {
  GetCurrentUserResponse,
  RequestAccountDataExportResponse,
  RequestAccountDeactivationBody,
  RequestAccountDeactivationResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { rateLimit } from "../middlewares/rateLimit";
import {
  buildAccountDataExport,
  buildAccountDeactivationRequest,
  getOrganizationById,
} from "../services/authService";

const router: IRouter = Router();
const accountDataExportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
});
const accountDeactivationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = req.appUser!;
  const organization = user.organizationId
    ? await getOrganizationById(user.organizationId)
    : null;

  const data = GetCurrentUserResponse.parse({
    user: {
      id: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
    organization,
  });
  res.json(data);
});

router.post(
  "/auth/data-export",
  accountDataExportRateLimit,
  requireAuth,
  async (req, res) => {
    const data = RequestAccountDataExportResponse.parse(
      buildAccountDataExport(req.appUser!),
    );
    req.log.info(
      { userId: req.appUser!.id, exportId: data.exportId },
      "Account data export generated",
    );
    res.json(data);
  },
);

router.post(
  "/auth/deactivation-request",
  accountDeactivationRateLimit,
  requireAuth,
  async (req, res) => {
    const parsed = RequestAccountDeactivationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "EXPLICIT_CONFIRMATION_REQUIRED",
        message: 'Type "DEACTIVATE" to confirm your account deactivation request.',
      });
      return;
    }

    const data = RequestAccountDeactivationResponse.parse(
      buildAccountDeactivationRequest(),
    );
    req.log.warn(
      { userId: req.appUser!.id, requestId: data.requestId },
      "Account deactivation request received",
    );
    res.status(202).json(data);
  },
);

export default router;
