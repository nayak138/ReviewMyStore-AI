/**
 * Canonical public site URL used for SEO (sitemap, canonical links, og:url).
 * Override with the VITE_SITE_URL env var once the production domain changes.
 * Works both in the browser bundle (import.meta.env) and in vite.config.ts (node).
 */
const envUrl =
  typeof import.meta.env !== "undefined"
    ? import.meta.env.VITE_SITE_URL
    : undefined;

export const SITE_URL: string = (
  envUrl ||
  (typeof process !== "undefined" ? process.env.VITE_SITE_URL : undefined) ||
  "https://reviewmystore.ai"
).replace(/\/+$/, "");
