import { Router, type IRouter } from "express";
import {
  CreateAdminAgencyBody,
  CreateAdminAgencyInvitationBody,
  CreateAdminAgencyInvitationParams,
  CreateAdminAgencyInvitationResponse,
  CreateAdminAgencyResponse,
  GetAdminOverviewResponse,
  GetAdminPortalResponse,
  GetPublicAgencyInvitationParams,
  GetPublicAgencyInvitationResponse,
  RevokeAdminAgencyInvitationParams,
  RevokeAdminAgencyInvitationResponse,
  UpdateAdminAgencyBody,
  UpdateAdminAgencyParams,
  UpdateAdminAgencyResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  AdminAgencyNotFoundError,
  AdminInvitationNotFoundError,
  AdminOwnerAlreadyExistsError,
  createAgency,
  createAgencyInvitation,
  getAdminOverview,
  getAdminPortal,
  getPublicAgencyInvitation,
  revokeAgencyInvitation,
  updateAgency,
} from "../services/adminService";

const router: IRouter = Router();

router.get(
  "/admin/overview",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (_req, res) => {
    const overview = await getAdminOverview();
    const data = GetAdminOverviewResponse.parse(overview);
    res.json(data);
  },
);

router.get(
  "/admin/portal",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (_req, res) => {
    const data = GetAdminPortalResponse.parse(await getAdminPortal());
    res.json(data);
  },
);

router.post(
  "/admin/agencies",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    const parsed = CreateAdminAgencyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_BODY",
        message: parsed.error.message,
      });
      return;
    }
    try {
      const result = await createAgency({
        ...parsed.data,
        createdByUserId: req.appUser!.id,
      });
      res.status(201).json(CreateAdminAgencyResponse.parse(result));
    } catch (error) {
      if (error instanceof AdminOwnerAlreadyExistsError) {
        res.status(409).json({
          success: false,
          code: "OWNER_ALREADY_EXISTS",
          message: error.message,
        });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/admin/agencies/:id",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    const params = UpdateAdminAgencyParams.safeParse(req.params);
    const parsed = UpdateAdminAgencyBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: params.error.message,
      });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    try {
      const result = await updateAgency(params.data.id, parsed.data);
      res.json(UpdateAdminAgencyResponse.parse(result));
    } catch (error) {
      if (error instanceof AdminAgencyNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: error.message,
        });
        return;
      }
      throw error;
    }
  },
);

router.post(
  "/admin/agencies/:id/invitations",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    const params = CreateAdminAgencyInvitationParams.safeParse(req.params);
    const parsed = CreateAdminAgencyInvitationBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: params.error.message,
      });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: parsed.error.message,
      });
      return;
    }
    try {
      const result = await createAgencyInvitation(
        params.data.id,
        req.appUser!.id,
        parsed.data.email,
        parsed.data.expiresInDays,
      );
      res.status(201).json(CreateAdminAgencyInvitationResponse.parse(result));
    } catch (error) {
      if (error instanceof AdminAgencyNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: error.message,
        });
        return;
      }
      throw error;
    }
  },
);

router.delete(
  "/admin/invitations/:id",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    const params = RevokeAdminAgencyInvitationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        success: false,
        code: "INVALID_PARAMS",
        message: params.error.message,
      });
      return;
    }
    try {
      const result = await revokeAgencyInvitation(params.data.id);
      res.json(RevokeAdminAgencyInvitationResponse.parse(result));
    } catch (error) {
      if (error instanceof AdminInvitationNotFoundError) {
        res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: error.message,
        });
        return;
      }
      throw error;
    }
  },
);

router.get(
  "/public/agency-invitations/:token",
  async (req, res) => {
    const params = GetPublicAgencyInvitationParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Invitation not found",
      });
      return;
    }
    const invitation = await getPublicAgencyInvitation(params.data.token);
    if (!invitation) {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Invitation not found or expired",
      });
      return;
    }
    res.json(GetPublicAgencyInvitationResponse.parse(invitation));
  },
);

export default router;
