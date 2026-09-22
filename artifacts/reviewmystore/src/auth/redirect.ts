// Shared path helpers for the Clerk-authenticated app tree. Centralized so
// `AuthenticatedApp` and `SessionExpiryWatcher` compute sign-in/return URLs
// identically instead of maintaining two copies that could drift.

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export function withBasePath(path: string): string {
  return `${basePath}${path === "/" ? "" : path}`;
}

export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/post-sign-in";
  }
  const path = stripBase(value);
  if (
    path === "/sign-in" ||
    path.startsWith("/sign-in/") ||
    path === "/sign-up" ||
    path.startsWith("/sign-up/")
  ) {
    return "/post-sign-in";
  }
  return path;
}

/** Builds the sign-in URL for an unauthenticated visit, preserving `location`
 * as the `redirect_url` so the user returns there after authenticating. */
export function signInRedirectFor(location: string): string {
  const [pathname, search = ""] = location.split("?", 2);
  const returnTo = `${pathname || "/"}${search ? `?${search}` : ""}`;
  return `${basePath}/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
}
