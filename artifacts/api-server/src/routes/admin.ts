import { Router, type IRouter } from "express";
import { GetAdminOverviewResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { getAdminOverview } from "../services/adminService";

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

export default router;
