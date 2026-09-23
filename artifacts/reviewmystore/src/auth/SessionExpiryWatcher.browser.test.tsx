import { useState, type Dispatch, type SetStateAction } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionExpiryWatcher } from "./SessionExpiryWatcher";

const PRIVATE_QUERY_KEY = ["private-workspace"];

const auth = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  getToken: vi.fn(),
  signOut: vi.fn(),
  setSignedIn: undefined as Dispatch<SetStateAction<boolean>> | undefined,
  redirectUrl: undefined as string | undefined,
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    getToken: auth.getToken,
    signOut: auth.signOut,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/businesses?tab=reviews", vi.fn()],
}));

function ProtectedPageFixture() {
  const { data } = useQuery({
    queryKey: PRIVATE_QUERY_KEY,
    queryFn: async () => ({ businessName: "Northstar Dental" }),
  });

  return (
    <main data-testid="protected-page">
      <h1>{data?.businessName}</h1>
      <p data-testid="private-query-data">
        Private review dashboard for Northstar Dental
      </p>
    </main>
  );
}

function AuthLossFixture({ queryClient }: { queryClient: QueryClient }) {
  const [signedIn, setSignedIn] = useState(true);
  auth.isSignedIn = signedIn;
  auth.setSignedIn = setSignedIn;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryWatcher />
      {signedIn ? (
        <ProtectedPageFixture />
      ) : (
        <div data-testid="sign-in-page" data-redirect-url={auth.redirectUrl ?? ""}>
          Sign in to continue
        </div>
      )}
    </QueryClientProvider>
  );
}

describe("SessionExpiryWatcher browser smoke test", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    auth.isLoaded = true;
    auth.isSignedIn = true;
    auth.getToken.mockReset();
    auth.signOut.mockReset();
    auth.redirectUrl = undefined;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });
    queryClient.setQueryData(PRIVATE_QUERY_KEY, {
      businessName: "Northstar Dental",
    });
    auth.signOut.mockImplementation(async ({ redirectUrl }: { redirectUrl: string }) => {
      auth.redirectUrl = redirectUrl;
      auth.setSignedIn?.(false);
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it("clears private data and removes the protected page after an empty token refresh", async () => {
    render(<AuthLossFixture queryClient={queryClient} />);

    expect(await screen.findByTestId("protected-page")).toBeVisible();
    expect(screen.getByTestId("private-query-data")).toHaveTextContent(
      "Private review dashboard for Northstar Dental",
    );
    expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toEqual({
      businessName: "Northstar Dental",
    });

    auth.getToken.mockResolvedValue(null);
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-page")).toBeVisible();
    });

    expect(screen.queryByTestId("protected-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("private-query-data")).not.toBeInTheDocument();
    expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sign-in-page")).toHaveAttribute(
      "data-redirect-url",
      expect.stringContaining(
        `redirect_url=${encodeURIComponent("/businesses?tab=reviews")}`,
      ),
    );
    expect(screen.getByTestId("sign-in-page")).toHaveAttribute(
      "data-redirect-url",
      expect.stringContaining("session_expired=1"),
    );
  });
});