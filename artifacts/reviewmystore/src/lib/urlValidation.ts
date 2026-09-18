import * as z from "zod";

const SOCIAL_HOSTS = {
  instagram: new Set(["instagram.com", "m.instagram.com"]),
  facebook: new Set(["facebook.com", "fb.com", "m.facebook.com"]),
} as const;

function parsedHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

export function safeHttpUrl(value: unknown): string | null {
  const url = parsedHttpUrl(value);
  return url ? url.toString() : null;
}

export function safeSocialUrl(
  value: unknown,
  network: keyof typeof SOCIAL_HOSTS,
): string | null {
  const url = parsedHttpUrl(value);
  if (!url || !SOCIAL_HOSTS[network].has(normalizedHostname(url))) return null;
  return url.toString();
}

const httpUrlSchema = z
  .string()
  .nullable()
  .optional()
  .refine((value) => value == null || value.trim() === "" || parsedHttpUrl(value) !== null, "Use an http:// or https:// URL");

export const websiteUrlSchema = httpUrlSchema;

export const instagramUrlSchema = httpUrlSchema.refine(
    (value) => value == null || value.trim() === "" || safeSocialUrl(value, "instagram") !== null,
    "Use an Instagram URL",
);

export const facebookUrlSchema = httpUrlSchema.refine(
  (value) => value == null || value.trim() === "" || safeSocialUrl(value, "facebook") !== null,
  "Use a Facebook URL",
);