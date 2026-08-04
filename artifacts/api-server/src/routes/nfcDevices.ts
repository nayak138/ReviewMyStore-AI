import { Router, type IRouter, type Request, type Response } from "express";
import {
  RegisterNfcDeviceBody,
  RegisterNfcDeviceResponse,
  UpdateNfcDeviceBody,
  UpdateNfcDeviceResponse,
  AssignNfcDeviceBody,
  AssignNfcDeviceResponse,
  UnassignNfcDeviceResponse,
  SetNfcDeviceStatusBody,
  SetNfcDeviceStatusResponse,
  ListNfcDevicesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { CampaignNotFoundError } from "../services/campaignService";
import {
  NfcDeviceNotFoundError,
  NfcInvalidStateError,
  NfcUidConflictError,
  assignNfcDevice,
  deleteNfcDevice,
  listNfcDevices,
  registerNfcDevice,
  setNfcDeviceStatus,
  unassignNfcDevice,
  updateNfcDevice,
} from "../services/nfcService";

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

function param(req: Request, name: string): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

function handleError(res: Response, err: unknown): boolean {
  if (err instanceof NfcDeviceNotFoundError || err instanceof CampaignNotFoundError) {
    res
      .status(404)
      .json({ success: false, code: "NOT_FOUND", message: err.message });
    return true;
  }
  if (err instanceof NfcUidConflictError) {
    res
      .status(409)
      .json({ success: false, code: "UID_CONFLICT", message: err.message });
    return true;
  }
  if (err instanceof NfcInvalidStateError) {
    res
      .status(400)
      .json({ success: false, code: "INVALID_STATE", message: err.message });
    return true;
  }
  return false;
}

router.get("/nfc-devices", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const devices = await listNfcDevices(organizationId, {
    businessId:
      typeof req.query.businessId === "string" ? req.query.businessId : undefined,
    campaignId:
      typeof req.query.campaignId === "string" ? req.query.campaignId : undefined,
  });
  res.json(ListNfcDevicesResponse.parse({ devices }));
});

router.post("/nfc-devices", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = RegisterNfcDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const device = await registerNfcDevice(organizationId, parsed.data);
    res.status(201).json(RegisterNfcDeviceResponse.parse(device));
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

router.patch("/nfc-devices/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = UpdateNfcDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const device = await updateNfcDevice(
      organizationId,
      param(req, "id"),
      parsed.data,
    );
    res.json(UpdateNfcDeviceResponse.parse(device));
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

router.delete("/nfc-devices/:id", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    await deleteNfcDevice(organizationId, param(req, "id"));
    res.status(204).end();
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

router.post("/nfc-devices/:id/assign", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = AssignNfcDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const device = await assignNfcDevice(
      organizationId,
      param(req, "id"),
      parsed.data.campaignId,
    );
    res.json(AssignNfcDeviceResponse.parse(device));
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

router.post("/nfc-devices/:id/unassign", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  try {
    const device = await unassignNfcDevice(organizationId, param(req, "id"));
    res.json(UnassignNfcDeviceResponse.parse(device));
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

router.post("/nfc-devices/:id/status", requireAuth, async (req, res) => {
  const organizationId = requireOrganization(req, res);
  if (!organizationId) return;

  const parsed = SetNfcDeviceStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: "INVALID_BODY",
      message: parsed.error.message,
    });
    return;
  }

  try {
    const device = await setNfcDeviceStatus(
      organizationId,
      param(req, "id"),
      parsed.data.status,
    );
    res.json(SetNfcDeviceStatusResponse.parse(device));
  } catch (err) {
    if (!handleError(res, err)) throw err;
  }
});

export default router;
