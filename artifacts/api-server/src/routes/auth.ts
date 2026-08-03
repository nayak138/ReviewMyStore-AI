import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrganizationById } from "../services/authService";

const router: IRouter = Router();

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

export default router;
