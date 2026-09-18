export const DEFAULT_SITE_URL = "https://5-star.ai";

/**
 * Validate and normalize the public origin used in absolute SEO URLs.
 * Marketing is served at the site's root, so path, query, and hash fragments
 * would create incorrect sitemap and canonical URLs.
 */
export function resolveSiteUrl(
  configuredUrl: string | undefined,
  requireConfiguredUrl: boolean,
): string {
  const candidate = configuredUrl?.trim();
  if (!candidate) {
    if (requireConfiguredUrl) {
      throw new Error("VITE_SITE_URL is required for production builds.");
    }
    return DEFAULT_SITE_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      "VITE_SITE_URL must be a valid http:// or https:// origin.",
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "VITE_SITE_URL must be a valid http:// or https:// origin.",
    );
  }

  return parsed.origin;
}
