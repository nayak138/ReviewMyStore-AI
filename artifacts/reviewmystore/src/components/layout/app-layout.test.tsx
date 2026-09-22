import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./app-layout";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut: mocks.signOut }),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentUserQueryKey: () => ["current-user"],
  useGetCurrentUser: () => ({
    data: { user: { role: "OWNER" } },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ["/businesses", vi.fn()],
}));

vi.mock("@/components/brand-logo", () => ({
  BrandLogo: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

describe("AppLayout sign out", () => {
  it("redirects to a clean sign-in URL without the session-expired marker", async () => {
    const user = userEvent.setup();
    render(
      <AppLayout title="Businesses">
        <div>Workspace</div>
      </AppLayout>,
    );

    await user.click(screen.getByRole("button", { name: "Sign Out" }));

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    const [{ redirectUrl }] = mocks.signOut.mock.calls[0] as [
      { redirectUrl: string },
    ];
    const redirect = new URL(redirectUrl, window.location.origin);

    expect(redirect.pathname).toBe("/sign-in");
    expect(redirect.searchParams.get("redirect_url")).toBe("/businesses");
    expect(redirect.searchParams.has("session_expired")).toBe(false);
  });
});