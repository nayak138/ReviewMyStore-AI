import type { Request } from "express";

function firstHeaderValue(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || null;
}

/**
 * Builds the user-facing origin for an OAuth callback.
 *
 * Replit's proxy supplies the original host and protocol through forwarded
 * headers. Using the incoming request avoids sending production OAuth flows
 * back to the workspace's development domain.
 */
export function publicOrigin(req: Request): string {
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) ?? req.protocol;
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) ?? req.get("host");
  if (!host || !["http", "https"].includes(protocol)) {
    throw new Error("Could not determine the public app origin.");
  }
  return `${protocol}://${host}`;
}