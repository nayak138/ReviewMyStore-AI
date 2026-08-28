import type { NextFunction, Request, Response } from "express";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getConfiguredOrigins(
  value = process.env.CORS_ALLOWED_ORIGINS,
): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin)),
  );
}

function requestOrigin(req: Request): string {
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host") || "";
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${host}`;
}

export function isTrustedOrigin(
  req: Request,
  origin: string,
  configuredOrigins = getConfiguredOrigins(),
): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  return (
    normalizedOrigin === requestOrigin(req) ||
    configuredOrigins.has(normalizedOrigin)
  );
}

function rejectOrigin(res: Response): void {
  res.status(403).json({
    success: false,
    code: "ORIGIN_NOT_ALLOWED",
    message: "Request origin is not allowed.",
  });
}

/**
 * Reject browser preflights and state-changing requests from origins that are
 * not the current host or explicitly configured in CORS_ALLOWED_ORIGINS.
 * Requests without Origin are retained for non-browser/bearer clients.
 */
export function originProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  if (
    (req.method === "OPTIONS" || STATE_CHANGING_METHODS.has(req.method)) &&
    !isTrustedOrigin(req, origin)
  ) {
    rejectOrigin(res);
    return;
  }

  next();
}

export { normalizeOrigin };