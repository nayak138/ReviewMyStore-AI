import type { Request } from "express";
import { UAParser } from "ua-parser-js";
import { db, scanEventsTable, type ScanEvent } from "@workspace/db";

export interface RequestMeta {
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

function headerValue(req: Request, name: string): string | null {
  const raw = req.headers[name];
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ? value.trim() : null;
}

/** Best-effort geo from common reverse-proxy/CDN headers. Null in local dev
 * (no proxy adds them) — analytics rows simply have unknown location. */
export function requestMeta(req: Request, referrer?: string | null): RequestMeta {
  return {
    userAgent: headerValue(req, "user-agent"),
    referrer: referrer ?? headerValue(req, "referer"),
    country:
      headerValue(req, "x-replit-user-country") ??
      headerValue(req, "cf-ipcountry") ??
      headerValue(req, "x-vercel-ip-country") ??
      headerValue(req, "x-country-code"),
    region:
      headerValue(req, "x-replit-user-region") ??
      headerValue(req, "cf-region") ??
      headerValue(req, "x-vercel-ip-country-region"),
    city:
      headerValue(req, "x-replit-user-city") ??
      headerValue(req, "cf-ipcity") ??
      headerValue(req, "x-vercel-ip-city"),
  };
}

export interface LogScanEventInput {
  eventType: ScanEvent["eventType"];
  organizationId: string;
  businessId: string | null;
  businessName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  redirectLinkId?: string | null;
  nfcDeviceId?: string | null;
  redirectSuccess: boolean;
  meta: RequestMeta;
}

export async function logScanEvent(input: LogScanEventInput): Promise<void> {
  const parsed = input.meta.userAgent
    ? UAParser(input.meta.userAgent)
    : null;

  await db.insert(scanEventsTable).values({
    eventType: input.eventType,
    organizationId: input.organizationId,
    businessId: input.businessId,
    businessName: input.businessName,
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    redirectLinkId: input.redirectLinkId ?? null,
    nfcDeviceId: input.nfcDeviceId ?? null,
    // ua-parser reports no device.type for desktop browsers.
    deviceType: parsed?.device.type ?? (parsed ? "desktop" : null),
    browser: parsed?.browser.name ?? null,
    os: parsed?.os.name ?? null,
    country: input.meta.country,
    region: input.meta.region,
    city: input.meta.city,
    referrer: input.meta.referrer,
    redirectSuccess: input.redirectSuccess,
  });
}
