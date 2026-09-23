import { Router, type IRouter, type Response } from "express";
import {
  AcceptTeamInvitationBody,
  CreateTeamInvitationBody,
  GetPublicTeamInvitationParams,
  ListBusinessTeamQueryParams,
  ListBusinessTeamResponse,
  GetPublicTeamInvitationResponse,
  UpdatePendingTeamInvitationBody,
  UpdateTeamMemberBody,
  UpdatePendingTeamInvitationParams,
  UpdateTeamMemberParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { publicOrigin } from "../lib/publicOrigin";
import {
  acceptTeamInvitation,
  createTeamInvitation,
  getPublicTeamInvitation,
  listTeam,
  removeTeamMember,
  resendTeamInvitation,
  revokeTeamInvitation,
  TeamBusinessNotFoundError,
  TeamForbiddenError,
  TeamInvitationConflictError,
  TeamInvitationEmailMismatchError,
  TeamInvitationNotFoundError,
  TeamSeatLimitError,
  updatePendingInvitation,
  updateTeamMember,
} from "../services/teamService";

const router: IRouter = Router();

function sendError(res: Response, error: unknown) {
  if (error instanceof TeamForbiddenError) {
    res.status(403).json({ success: false, code: "FORBIDDEN", message: error.message });
    return;
  }
  if (error instanceof TeamBusinessNotFoundError || error instanceof TeamInvitationNotFoundError) {
    res.status(404).json({ success: false, code: "NOT_FOUND", message: error.message });
    return;
  }
  if (error instanceof TeamSeatLimitError) {
    res.status(409).json({ success: false, code: "TEAM_FULL", message: error.message });
    return;
  }
  if (error instanceof TeamInvitationConflictError) {
    res.status(409).json({ success: false, code: "INVITATION_CONFLICT", message: error.message });
    return;
  }
  if (error instanceof TeamInvitationEmailMismatchError) {
    res.status(403).json({ success: false, code: "INVITED_EMAIL_REQUIRED", message: error.message });
    return;
  }
  throw error;
}

router.get("/teams", requireAuth, requireRole("OWNER"), async (req, res) => {
  const parsed = ListBusinessTeamQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: "INVALID_QUERY", message: parsed.error.message });
    return;
  }
  try {
    res.json(ListBusinessTeamResponse.parse(await listTeam(parsed.data.businessId, req.appUser!)));
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/teams/invitations", requireAuth, requireRole("OWNER"), async (req, res) => {
  const parsed = CreateTeamInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: "INVALID_BODY", message: parsed.error.message });
    return;
  }
  try {
    const result = await createTeamInvitation({
      owner: req.appUser!,
      businessId: parsed.data.businessId,
      email: parsed.data.email,
      invitedName: parsed.data.invitedName,
      expiresInDays: parsed.data.expiresInDays,
      grants: {
        campaignsPermission: parsed.data.campaignsPermission,
        reviewInboxPermission: parsed.data.reviewInboxPermission,
        feedbackPermission: parsed.data.feedbackPermission,
        socialMediaPermission: parsed.data.socialMediaPermission,
        analyticsPermission: parsed.data.analyticsPermission,
      },
      publicOrigin: publicOrigin(req),
    });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/teams/invitations/:id", requireAuth, requireRole("OWNER"), async (req, res) => {
  const params = UpdatePendingTeamInvitationParams.safeParse(req.params);
  const parsed = UpdatePendingTeamInvitationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    const message = params.success
      ? parsed.success
        ? "Invalid request."
        : parsed.error.message
      : params.error.message;
    res.status(400).json({ success: false, code: "INVALID_REQUEST", message });
    return;
  }
  try {
    res.json(await updatePendingInvitation(params.data.id, req.appUser!, parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/teams/invitations/:id/resend", requireAuth, requireRole("OWNER"), async (req, res) => {
  const params = UpdatePendingTeamInvitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, code: "INVALID_PARAMS", message: params.error.message });
    return;
  }
  try {
    res.json(await resendTeamInvitation(params.data.id, req.appUser!, publicOrigin(req)));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/teams/invitations/:id", requireAuth, requireRole("OWNER"), async (req, res) => {
  const params = UpdatePendingTeamInvitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, code: "INVALID_PARAMS", message: params.error.message });
    return;
  }
  try {
    res.json(await revokeTeamInvitation(params.data.id, req.appUser!));
  } catch (error) {
    sendError(res, error);
  }
});

router.patch("/teams/members/:id", requireAuth, requireRole("OWNER"), async (req, res) => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  const parsed = UpdateTeamMemberBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    const message = params.success
      ? parsed.success
        ? "Invalid request."
        : parsed.error.message
      : params.error.message;
    res.status(400).json({ success: false, code: "INVALID_REQUEST", message });
    return;
  }
  try {
    res.json(await updateTeamMember(params.data.id, req.appUser!, parsed.data));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/teams/members/:id", requireAuth, requireRole("OWNER"), async (req, res) => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ success: false, code: "INVALID_PARAMS", message: params.error.message });
    return;
  }
  try {
    res.json(await removeTeamMember(params.data.id, req.appUser!));
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/public/team-invitations/:token", async (req, res) => {
  const params = GetPublicTeamInvitationParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ success: false, code: "NOT_FOUND", message: "Invitation not found or expired." });
    return;
  }
  const result = await getPublicTeamInvitation(params.data.token);
  if (!result) {
    res.status(404).json({ success: false, code: "NOT_FOUND", message: "Invitation not found or expired." });
    return;
  }
  res.json(GetPublicTeamInvitationResponse.parse(result));
});

router.post("/teams/accept", requireAuth, async (req, res) => {
  const parsed = AcceptTeamInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: "INVALID_BODY", message: parsed.error.message });
    return;
  }
  try {
    res.json(await acceptTeamInvitation(parsed.data.token, req.appUser!));
  } catch (error) {
    sendError(res, error);
  }
});

export default router;