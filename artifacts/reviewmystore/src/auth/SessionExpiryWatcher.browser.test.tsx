import { useState, type Dispatch, type SetStateAction } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AuthenticatedRoutes } from "./AuthenticatedApp";
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
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div aria-label="Sign-in form" role="form" />,
  SignUp: () => null,
  useAuth: () => ({
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    getToken: auth.getToken,
    signOut: auth.signOut,
  }),
  useClerk: () => ({
    addListener: vi.fn(() => vi.fn()),
  }),
}));

vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: () => "pk_test_session_expiry_browser",
}));

vi.mock("@clerk/themes", () => ({
  shadcn: {},
}));

vi.mock("@workspace/api-client-react", () => ({
  ApiError: class ApiError extends Error {},
  getGetCurrentUserQueryKey: () => ["current-user"],
  getGetPublicAgencyInvitationQueryKey: () => ["agency-invitation"],
  useGetCurrentUser: () => ({ data: undefined, isLoading: false, isError: false }),
  useGetPublicAgencyInvitation: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/components/book-demo-dialog-lazy", () => ({
  BookDemoDialog: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/pages/Onboarding", () => ({
  default: () => (
    <main data-route="/onboarding" data-testid="protected-page">
      Onboarding private content
    </main>
  ),
}));

vi.mock("@/pages/Businesses", () => ({
  default: () => (
    <main data-route="/businesses" data-testid="protected-page">
      Businesses private content
    </main>
  ),
}));

vi.mock("@/pages/Campaigns", () => ({
  default: () => (
    <main data-route="/campaigns" data-testid="protected-page">
      Campaigns private content
    </main>
  ),
}));

vi.mock("@/pages/QrCodes", () => ({
  default: () => (
    <main data-route="/qr-codes" data-testid="protected-page">
      QR codes private content
    </main>
  ),
}));

vi.mock("@/pages/Reviews", () => ({
  default: () => (
    <main data-route="/reviews" data-testid="protected-page">
      Reviews private content
    </main>
  ),
}));

vi.mock("@/pages/Feedback", () => ({
  default: () => (
    <main data-route="/feedback" data-testid="protected-page">
      Feedback private content
    </main>
  ),
}));

vi.mock("@/pages/SocialMedia", () => ({
  default: () => (
    <main data-route="/social-media" data-testid="protected-page">
      Social media private content
    </main>
  ),
}));

vi.mock("@/pages/BusinessAnalytics", () => ({
  default: () => (
    <main data-route="/business-analytics" data-testid="protected-page">
      Business analytics private content
    </main>
  ),
}));

vi.mock("@/pages/Analytics", () => ({
  default: () => (
    <main data-route="/insights" data-testid="protected-page">
      Insights private content
    </main>
  ),
}));

vi.mock("@/pages/Settings", () => ({
  default: () => (
    <main data-route="/settings" data-testid="protected-page">
      Settings private content
    </main>
  ),
}));

vi.mock("@/pages/AdminLeads", () => ({
  default: () => (
    <main data-route="/admin/leads" data-testid="protected-page">
      Admin leads private content
    </main>
  ),
}));

vi.mock("@/pages/AdminPortal", () => ({
  default: () => (
    <main data-route="/admin/portal" data-testid="protected-page">
      Admin portal private content
    </main>
  ),
}));

const PROTECTED_ROUTE_FIXTURES = [
  { path: "/onboarding", label: "onboarding" },
  { path: "/businesses", label: "businesses" },
  { path: "/campaigns", label: "campaigns" },
  { path: "/qr-codes", label: "QR codes" },
  { path: "/reviews", label: "reviews" },
  { path: "/feedback", label: "feedback" },
  { path: "/social-media", label: "social media" },
  { path: "/business-analytics", label: "business analytics" },
  { path: "/insights", label: "insights" },
  { path: "/settings", label: "settings" },
  { path: "/admin/leads", label: "admin leads" },
  { path: "/admin/portal", label: "admin portal" },
] as const;

function PrivateQueryFixture() {
  const { data } = useQuery({
    queryKey: PRIVATE_QUERY_KEY,
    queryFn: async () => ({ businessName: "Northstar Dental" }),
  });

  return (
    <div data-testid="private-query-data">
      {data?.businessName}
    </div>
  );
}

function AuthLossFixture({
  queryClient,
  location,
}: {
  queryClient: QueryClient;
  location: ReturnType<typeof memoryLocation>;
}) {
  const [signedIn, setSignedIn] = useState(true);
  auth.isSignedIn = signedIn;
  auth.setSignedIn = setSignedIn;

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={location.hook}>
        <SessionExpiryWatcher />
        {signedIn && <PrivateQueryFixture />}
        <AuthenticatedRoutes />
      </Router>
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

  it.each(PROTECTED_ROUTE_FIXTURES)(
    "clears private data and removes the $label page after an empty token refresh",
    async (route) => {
      const location = memoryLocation({ path: route.path, record: true });
      render(<AuthLossFixture queryClient={queryClient} location={location} />);

      const protectedPage = await screen.findByTestId("protected-page");
      expect(protectedPage).toBeVisible();
      expect(protectedPage).toHaveAttribute(
        "data-route",
        route.path.split("?")[0],
      );
      expect(screen.getByTestId("private-query-data")).toHaveTextContent(
        "Northstar Dental",
      );
      expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toEqual({
        businessName: "Northstar Dental",
      });

      auth.getToken.mockResolvedValue(null);
      window.dispatchEvent(new Event("focus"));

      await waitFor(() => {
        expect(auth.signOut).toHaveBeenCalledTimes(1);
        expect(auth.redirectUrl).toEqual(
          expect.stringContaining("session_expired=1"),
        );
      });

      expect(screen.queryByTestId("protected-page")).not.toBeInTheDocument();
      expect(screen.queryByTestId("private-query-data")).not.toBeInTheDocument();
      expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toBeUndefined();
      expect(auth.redirectUrl).toEqual(
        expect.stringContaining(
          `redirect_url=${encodeURIComponent(route.path)}`,
        ),
      );
    },
  );
});