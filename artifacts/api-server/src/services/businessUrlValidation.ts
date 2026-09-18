const SOCIAL_HOSTS = {
  instagram: new Set(["instagram.com", "m.instagram.com"]),
  facebook: new Set(["facebook.com", "fb.com", "m.facebook.com"]),
} as const;

export class InvalidBusinessUrlError extends Error {
  readonly status = 400;
  readonly code = "INVALID_BUSINESS_URL";

  constructor(message: string) {
    super(message);
    this.name = "InvalidBusinessUrlError";
  }
}

function normalizeHttpUrl(
  value: string | null | undefined,
  label: string,
): string | null | undefined {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidBusinessUrlError(
      `${label} must be a valid http:// or https:// URL.`,
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw new InvalidBusinessUrlError(
      `${label} must be a valid http:// or https:// URL.`,
    );
  }
  return parsed.toString();
}

function normalizeSocialUrl(
  value: string | null | undefined,
  network: keyof typeof SOCIAL_HOSTS,
  label: string,
): string | null | undefined {
  const normalized = normalizeHttpUrl(value, label);
  if (!normalized) return normalized;

  const parsed = new URL(normalized);
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!SOCIAL_HOSTS[network].has(hostname)) {
    throw new InvalidBusinessUrlError(
      `${label} must use an official ${label.toLowerCase()} URL.`,
    );
  }
  return normalized;
}

export interface BusinessUrlFields {
  website?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

/**
 * Normalize links when they enter the API, then defensively filter them again
 * on public rendering. This prevents unsafe schemes from new writes while
 * preserving existing historical rows without destructive data cleanup.
 */
export function normalizeBusinessUrls<T extends BusinessUrlFields>(
  input: T,
): T {
  return {
    ...input,
    ...(input.website !== undefined
      ? { website: normalizeHttpUrl(input.website, "Website") }
      : {}),
    ...(input.instagramUrl !== undefined
      ? {
          instagramUrl: normalizeSocialUrl(
            input.instagramUrl,
            "instagram",
            "Instagram",
          ),
        }
      : {}),
    ...(input.facebookUrl !== undefined
      ? {
          facebookUrl: normalizeSocialUrl(
            input.facebookUrl,
            "facebook",
            "Facebook",
          ),
        }
      : {}),
  } as T;
}

export function safePublicHttpUrl(value: string | null): string | null {
  try {
    return normalizeHttpUrl(value, "Website") ?? null;
  } catch {
    return null;
  }
}

export function safePublicSocialUrl(
  value: string | null,
  network: keyof typeof SOCIAL_HOSTS,
): string | null {
  try {
    return (
      normalizeSocialUrl(
        value,
        network,
        network === "instagram" ? "Instagram" : "Facebook",
      ) ?? null
    );
  } catch {
    return null;
  }
}
