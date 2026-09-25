import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminPortal from "./AdminPortal";

const mocks = vi.hoisted(() => ({
  updatePricing: vi.fn(),
  pricingOptions: undefined as { mutation?: { onSuccess?: () => void; onError?: () => void } } | undefined,
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetAdminPortalQueryKey: () => ["/api/admin/portal"],
  getGetCurrentUserQueryKey: () => ["/api/auth/me"],
  getListAdminDeactivationRequestsQueryKey: () => ["/api/admin/deactivation-requests"],
  getListAdminSharedReviewImportsQueryKey: () => ["/api/admin/shared-review-imports"],
  useGetCurrentUser: () => ({ data: { user: { role: "SUPER_ADMIN" } }, isLoading: false }),
  useGetAdminPortal: () => ({
    data: {
      overview: { totalOrganizations: 1, totalOwners: 1, totalSuperAdmins: 1, totalSuspendedOrganizations: 0, totalBusinesses: 1, pendingInvitations: 0 },
      agencies: [],
      businesses: [{
        id: "business-1",
        organizationId: "org-1",
        organizationName: "Northstar Digital",
        organizationSlug: "northstar",
        name: "Juniper House",
        slug: "juniper-house",
        category: "Hospitality",
        ownerName: "Maya Chen",
        ownerEmail: "maya@northstar.example",
        status: "ACTIVE",
        archivedAt: null,
        createdAt: "2026-09-01T00:00:00Z",
        usageBilling: {
          quotedMonthlyBaseAmountCents: 8750,
          currency: "USD",
          highestMultiplier: 2,
          manualInvoiceTotalCents: 17500,
          categories: [{ metric: "SOCIAL_POSTS_MONTHLY", label: "Monthly social posts", used: 75, baseLimit: 50, multiplier: 2 }],
        },
      }],
      usageTierAlerts: [{
        businessId: "business-1",
        businessName: "Juniper House",
        organizationName: "Northstar Digital",
        ownerName: "Maya Chen",
        ownerEmail: "maya@northstar.example",
        category: "Monthly social posts",
        used: 75,
        baseLimit: 50,
        multiplier: 2,
        quotedMonthlyBaseAmountCents: 8750,
        manualInvoiceTotalCents: 17500,
        currency: "USD",
      }],
    },
    isLoading: false,
  }),
  useListAdminDeactivationRequests: () => ({ data: { requests: [], pendingCount: 0 }, isLoading: false, refetch: vi.fn() }),
  useListAdminSharedReviewImports: () => ({ data: { attempts: [] }, isLoading: false }),
  useUpdateAdminBusinessUsagePricing: (options?: typeof mocks.pricingOptions) => {
    mocks.pricingOptions = options;
    return { mutate: mocks.updatePricing, isPending: false };
  },
  useCheckAdminSharedReviewImport: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateAdminAgency: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateAdminAgencyInvitation: () => ({ mutate: vi.fn(), isPending: false }),
  useResetAdminPlatformData: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeAdminAgencyInvitation: () => ({ mutate: vi.fn(), isPending: false }),
  useReviewAdminDeactivationRequest: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminAgency: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderAdmin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AdminPortal />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.updatePricing.mockClear();
  mocks.pricingOptions = undefined;
});

afterEach(() => cleanup());

describe("AdminPortal usage billing", () => {
  it("shows tier alerts, manual estimates, and saves an edited quote", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: /all businesses/i }));

    expect(screen.getByTestId("usage-tier-alerts")).toBeInTheDocument();
    expect(screen.getAllByText("Juniper House").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("$175.00")).toBeInTheDocument();

    await user.clear(screen.getByTestId("input-usage-quote-business-1"));
    await user.type(screen.getByTestId("input-usage-quote-business-1"), "100");
    await user.clear(screen.getByTestId("input-usage-currency-business-1"));
    await user.type(screen.getByTestId("input-usage-currency-business-1"), "eur");
    await user.click(screen.getByTestId("button-save-usage-business-1"));

    expect(mocks.updatePricing).toHaveBeenCalledWith({
      businessId: "business-1",
      data: { quotedMonthlyBaseAmountCents: 10000, currency: "EUR" },
    });
  });
});