import { resolveSiteUrl } from "./lib/site-url";

/**
 * Canonical public site URL used by browser-rendered SEO metadata. Vite config
 * resolves the same value separately via loadEnv for sitemap/prerender output.
 */
export const SITE_URL = resolveSiteUrl(
  import.meta.env.VITE_SITE_URL,
  import.meta.env.PROD,
);
