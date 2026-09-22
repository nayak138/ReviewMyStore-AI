import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { signInRedirectFor } from "./redirect";
import { onSessionExpired } from "./session-expiry";

/**
 * Mounted once inside the Clerk-authenticated app tree (see
 * `AuthenticatedApp`). Catches two paths to an expired session that would
 * otherwise leave a stale dashboard on screen:
 *
 * 1. Any API call rejected as unauthenticated. The query client's global
 *    error handler (see `App.tsx`) calls `signalSessionExpired("api")` for
 *    every confirmed 401, which this component listens for.
 * 2. The tab regaining visibility or focus after being backgrounded -- for
 *    example the laptop was closed and reopened, or the tab sat inactive for
 *    a long time. Clerk's own client-side `isSignedIn` state can lag behind
 *    a session that actually expired while the tab was suspended, since no
 *    JS ran to detect it. On resume, this forces a fresh token check.
 *
 * Either path clears cached private data and signs out to the sign-in page,
 * preserving the current location as the return path. Concurrent triggers
 * (e.g. several in-flight requests all failing with 401 at once) are
 * coalesced into a single sign-out via `handlingRef`.
 */
export function SessionExpiryWatcher() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  const locationRef = useRef(location);
  locationRef.current = location;
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;
  const handlingRef = useRef(false);

  // A fresh, successful sign-in re-arms the watcher so a later expiry can be
  // caught again.
  useEffect(() => {
    if (isSignedIn) handlingRef.current = false;
  }, [isSignedIn]);

  const handleExpiry = useCallback(() => {
    if (handlingRef.current || !isSignedInRef.current) return;
    handlingRef.current = true;
    queryClient.clear();
    void signOut({
      redirectUrl: signInRedirectFor(locationRef.current, {
        sessionExpired: true,
      }),
    });
  }, [queryClient, signOut]);

  useEffect(() => onSessionExpired(handleExpiry), [handleExpiry]);

  useEffect(() => {
    if (!isLoaded) return;

    const revalidate = () => {
      if (document.visibilityState !== "visible" || !isSignedInRef.current) {
        return;
      }
      getToken({ skipCache: true })
        .then((token) => {
          if (!token) handleExpiry();
        })
        .catch(() => {
          // A failed refresh attempt (offline, transient network error) is
          // not evidence of expiry -- only an explicit empty token is.
        });
    };

    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [isLoaded, getToken, handleExpiry]);

  return null;
}
