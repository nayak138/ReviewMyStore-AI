import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInRedirectFor } from "./redirect";
import { SignInPage } from "./AuthenticatedApp";

const mocks = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: false,
}));

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div aria-label="Sign-in form" role="form" />,
  SignUp: () => null,
  useAuth: () => ({
    isLoaded: mocks.isLoaded,
    isSignedIn: mocks.isSignedIn,
  }),
  useClerk: () => ({
    addListener: () => () => {},
  }),
}));

vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: () => "pk_test_sign_in_regression",
}));

vi.mock("@clerk/themes", () => ({
  shadcn: {},
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentUserQueryKey: () => ["current-user"],
  getGetPublicAgencyInvitationQueryKey: () => ["agency-invitation"],
  useGetCurrentUser: () => ({ data: undefined, isLoading: false }),
  useGetPublicAgencyInvitation: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/components/book-demo-dialog", () => ({
  BookDemoDialog: ({ children }: { children: React.ReactNode }) => children,
}));

describe("SignInPage session-expiry notice", () => {
  function renderSignInAt(url: string) {
    window.history.replaceState(
      {},
      "",
      url,
    );
    return render(<SignInPage />);
  }

  beforeEach(() => {
    window.history.replaceState(
      {},
      "",
      signInRedirectFor("/businesses?tab=reviews"),
    );
  });

  it("renders the expired-session explanation for the marked sign-in route", () => {
    renderSignInAt(
      signInRedirectFor("/businesses?tab=reviews", {
        sessionExpired: true,
      }),
    );

    expect(
      screen.getByText("Your session expired. Please sign in again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Sign-in form" })).toBeInTheDocument();
  });

  it.each([
    ["a manual sign-out redirect", signInRedirectFor("/businesses?tab=reviews")],
    [
      "an unrelated query marker",
      `${signInRedirectFor("/businesses?tab=reviews")}&notice=1`,
    ],
  ])("renders no expiry notice for %s", (_description, url) => {
    renderSignInAt(url);

    expect(
      screen.queryByText("Your session expired. Please sign in again."),
    ).not.toBeInTheDocument();
  });
});