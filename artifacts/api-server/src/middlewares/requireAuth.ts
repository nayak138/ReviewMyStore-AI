import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import {
  AgencyInvitationRequiredError,
  getOrCreateUserForClerkId,
} from "../services/authService";
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
    req.appUser = await getOrCreateUserForClerkId(auth.userId);
    next();
  } catch (err) {
    req.log?.error({ err }, "Failed to resolve authenticated user");
    if (err instanceof AgencyInvitationRequiredError) {
      res.status(403).json({
        success: false,
        code: "INVITATION_REQUIRED",
        message:
          "An active agency invitation is required before this account can access the platform.",
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
