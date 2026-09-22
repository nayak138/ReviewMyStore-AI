import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionExpiryWatcher } from "./SessionExpiryWatcher";
import { signalSessionExpired } from "./session-expiry";

const mocks = vi.hoisted(() => ({
  isSignedIn: true,
  isLoaded: true,
  getToken: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    isLoaded: mocks.isLoaded,
    isSignedIn: mocks.isSignedIn,
    getToken: mocks.getToken,
    signOut: mocks.signOut,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/businesses?tab=reviews", vi.fn()],
}));

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

function renderWatcher(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionExpiryWatcher />
    </QueryClientProvider>,
  );
}

describe("SessionExpiryWatcher", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mocks.isSignedIn = true;
    mocks.isLoaded = true;
    mocks.getToken.mockReset();
    mocks.signOut.mockReset();
    queryClient = new QueryClient();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears cached data and signs out, preserving the current location, on a broadcast API 401", async () => {
    const clearSpy = vi.spyOn(queryClient, "clear");
    renderWatcher(queryClient);

    act(() => {
      signalSessionExpired("api");
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    const [{ redirectUrl }] = mocks.signOut.mock.calls[0];
    expect(redirectUrl).toContain("/sign-in");
    expect(redirectUrl).toContain(
      encodeURIComponent("/businesses?tab=reviews"),
    );
    expect(redirectUrl).toContain("session_expired=1");
  });

  it("does not sign out when already signed out", () => {
    mocks.isSignedIn = false;
    renderWatcher(queryClient);

    act(() => {
      signalSessionExpired("api");
    });

    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("coalesces multiple concurrent expiry signals into a single sign-out", () => {
    renderWatcher(queryClient);

    act(() => {
      signalSessionExpired("api");
      signalSessionExpired("api");
      signalSessionExpired("api");
    });

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("re-arms after a fresh sign-in so a later expiry is caught again", () => {
    const { rerender } = renderWatcher(queryClient);

    act(() => {
      signalSessionExpired("api");
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    mocks.isSignedIn = false;
    rerender(
      <QueryClientProvider client={queryClient}>
        <SessionExpiryWatcher />
      </QueryClientProvider>,
    );
    mocks.isSignedIn = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <SessionExpiryWatcher />
      </QueryClientProvider>,
    );

    act(() => {
      signalSessionExpired("api");
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });

  it("signs out when the tab becomes visible again and the refreshed token is empty", async () => {
    mocks.getToken.mockResolvedValue(null);
    renderWatcher(queryClient);

    setVisibility("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });
    expect(mocks.getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it("stays signed in when the tab becomes visible again and a valid token is returned", async () => {
    mocks.getToken.mockResolvedValue("a-valid-token");
    renderWatcher(queryClient);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mocks.getToken).toHaveBeenCalled();
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("does not treat a failed token refresh (offline/network error) as expiry", async () => {
    mocks.getToken.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWatcher(queryClient);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mocks.getToken).toHaveBeenCalled();
    });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("ignores focus/visibility revalidation while the tab is hidden", () => {
    setVisibility("hidden");
    renderWatcher(queryClient);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});
