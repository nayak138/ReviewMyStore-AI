import { ApiError } from "@workspace/api-client-react";

export type SessionExpiryReason = "api" | "revalidate";
type Listener = (reason: SessionExpiryReason) => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to session-expiry signals broadcast by `signalSessionExpired`.
 * Returns an unsubscribe function. Listeners are responsible for deduping
 * concurrent/duplicate signals -- this module makes no assumption about how
 * many listeners are registered or how many times a signal fires.
 */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Broadcast that the authenticated session appears to have expired, either
 * because an API call was rejected as unauthenticated (`"api"`) or because
 * revalidating the Clerk session after the app resumed found no valid token
 * (`"revalidate"`).
 */
export function signalSessionExpired(reason: SessionExpiryReason): void {
  for (const listener of listeners) listener(reason);
}

/**
 * True only for API responses that unambiguously mean "you are not signed
 * in" -- a 401 `UNAUTHENTICATED` from this backend's `requireAuth`
 * middleware. Deliberately excludes 403 (permission, suspended-account, or
 * suspended-organization errors, which never mean the session expired) and
 * non-`ApiError` failures such as offline/network drops or response-parsing
 * errors, none of which are evidence of an expired session.
 */
export function isSessionExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 401) return false;
  const code =
    error.data && typeof error.data === "object"
      ? (error.data as { code?: unknown }).code
      : undefined;
  return code === undefined || code === "UNAUTHENTICATED";
}
