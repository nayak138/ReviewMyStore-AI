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
  replitDomains = process.env.REPLIT_DOMAINS,
  replitDevDomain = process.env.REPLIT_DEV_DOMAIN,
): Set<string> {
  const replitOrigins = [...(replitDomains ?? "").split(","), replitDevDomain]
    .map((domain) => domain?.trim() ?? "")
    .filter(Boolean)
    .map((domain) =>
      normalizeOrigin(
        domain.startsWith("http://") || domain.startsWith("https://")
          ? domain
          : `https://${domain}`,
      ),
    );

  return new Set(
    [
      ...(value ?? "")
        .split(",")
        .map((origin) => normalizeOrigin(origin.trim())),
      ...replitOrigins,
    ].filter((origin): origin is string => Boolean(origin)),
  );
}

export function isTrustedOrigin(
  origin: string,
  configuredOrigins = getConfiguredOrigins(),
): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && configuredOrigins.has(normalizedOrigin));
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
 * not explicitly configured. Origins are derived from deployment-controlled
 * environment values rather than forwarded request headers, which a caller
 * can otherwise forge.
 *
 * Requests without Origin remain available to non-browser/bearer clients.
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
    !isTrustedOrigin(origin)
  ) {
    rejectOrigin(res);
    return;
  }

  next();
}

export { normalizeOrigin };
