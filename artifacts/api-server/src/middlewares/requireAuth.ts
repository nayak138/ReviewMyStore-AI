import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  AgencyInvitationRequiredError,
  getOrCreateUserForClerkId,
  getOrganizationById,
  VerifiedEmailRequiredError,
} from "../services/authService";
import {
  TEAM_SCHEMA_NOT_READY_CODE,
  TeamSchemaNotReadyError,
} from "../services/teamSchemaReadiness";
import type { User } from "@workspace/db/schema";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUser?: User;
    }
  }
}

/**
 * Verifies the Clerk session and attaches the local `appUser` record to the
 * request, JIT-provisioning an Organization + Owner (or Super Admin) record
 * on the user's first authenticated call. Responds 401 when unauthenticated.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      message: "You must be signed in to access this resource.",
    });
    return;
  }

  try {
    const teamInvitationToken =
      typeof req.body?.token === "string" ? req.body.token : undefined;
    const appUser = await getOrCreateUserForClerkId(auth.userId, {
      teamInvitationToken,
    });
    if (appUser.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "This account is suspended. Contact the platform administrator.",
      });
      return;
    }

    if (appUser.organizationId) {
      const organization = await getOrganizationById(appUser.organizationId);
      if (!organization || organization.status !== "ACTIVE") {
        res.status(403).json({
          success: false,
          code: "ORGANIZATION_SUSPENDED",
          message:
            "This organization is unavailable. Contact the platform administrator.",
        });
        return;
      }
    }

    req.appUser = appUser;
    next();
  } catch (err) {
    req.log?.error({ err }, "Failed to resolve authenticated user");
    if (
      err instanceof AgencyInvitationRequiredError ||
      err instanceof VerifiedEmailRequiredError ||
      err instanceof TeamSchemaNotReadyError
    ) {
      if (err instanceof TeamSchemaNotReadyError) {
        res.status(503).json({
          success: false,
          code: TEAM_SCHEMA_NOT_READY_CODE,
          message: err.message,
        });
        return;
      }
      res.status(403).json({
        success: false,
        code:
          err instanceof VerifiedEmailRequiredError
            ? "VERIFIED_EMAIL_REQUIRED"
            : "INVITATION_REQUIRED",
        message:
          err instanceof VerifiedEmailRequiredError
            ? "A verified primary email address is required before this account can access the platform."
            : "An active agency invitation is required before this account can access the platform.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      code: "AUTH_PROVISIONING_FAILED",
      message: "Could not load your account. Please try again.",
    });
  }
}

/**
 * Restricts a route to one or more app roles. Must run after requireAuth.
 */
export function requireRole(...roles: Array<User["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.appUser) {
      res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "You must be signed in to access this resource.",
      });
      return;
    }
    if (!roles.includes(req.appUser.role)) {
      res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource.",
      });
      return;
    }
    next();
  };
}
