import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Businesses from "./Businesses";
import Campaigns from "./Campaigns";
import Feedback from "./Feedback";
import Reviews from "./Reviews";
import Settings from "./Settings";
import { BusinessTabs } from "@/components/business/business-tabs";

const mocks = vi.hoisted(() => {
  const businesses = [
    {
      id: "business-1",
      name: "Northstar Coffee",
      category: "Cafe",
      slug: "northstar-coffee",
      status: "ACTIVE",
      archivedAt: null,
    },
  ];

  const campaigns = [
    {
      id: "campaign-1",
      businessId: "business-1",
      name: "Summer launch",
      slug: "summer-launch",
      description: "Summer campaign",
      status: "ACTIVE",
      archivedAt: null,
    },
    {
      id: "campaign-2",
      businessId: "business-1",
      name: "Staff picks",
      slug: "staff-picks",
      description: "Staff campaign",
      status: "DRAFT",
      archivedAt: null,
    },
  ];
  const keywords = [
    {
      id: "keyword-1",
      campaignId: "campaign-1",
      label: "Great Selection",
      category: "PRODUCT_SERVICE",
      enabled: true,
      sortOrder: 0,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    {
      id: "keyword-2",
      campaignId: "campaign-1",
      label: "Good Prices",
      category: "PRODUCT_SERVICE",
      enabled: true,
      sortOrder: 1,
      createdAt: new Date("2026-01-02"),
      updatedAt: new Date("2026-01-02"),
    },
    {
      id: "keyword-3",
      campaignId: "campaign-1",
      label: "Helpful Staff",
      category: "EXPERIENCE",
      enabled: true,
      sortOrder: 0,
      createdAt: new Date("2026-01-03"),
      updatedAt: new Date("2026-01-03"),
    },
  ];
  const keywordMutation = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(() => Promise.resolve()),
    isPending: false,
  };
  const accountDataExportMutation = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  };
  const accountDeactivationMutation = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  };

  return {
    businesses,
    campaigns,
    keywords,
    keywordMutation,
    accountDataExportMutation,
    accountDeactivationMutation,
    navigate: vi.fn(),
    mutation: () => ({ mutate: vi.fn(), isPending: false }),
    qrError: null as Error | null,
    qrRefetch: vi.fn(),
    reviewDashboard: {
      connection: { status: "DISCONNECTED", provider: "BNDLE", lastSyncedAt: null, lastError: null },
      locations: [],
      summary: { totalReviews: 0, needsReply: 0, replied: 0 },
    },
  };
});

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut: vi.fn(), openUserProfile: vi.fn() }),
  useUser: () => ({
    user: {
      fullName: "Morgan Lee",
      imageUrl: "",
      primaryEmailAddress: {
        emailAddress: "morgan@example.com",
        verification: { status: "verified" },
      },
    },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
  useLocation: () => ["/businesses", mocks.navigate],
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetCurrentUserQueryKey: () => ["current-user"],
  useGetCurrentUser: () => ({
    data: {
      user: {
        id: "user-1",
        organizationId: null,
        name: "Morgan Lee",
        email: "morgan@example.com",
        role: "OWNER",
        status: "ACTIVE",
        lastLoginAt: "2026-01-10T10:00:00.000Z",
        createdAt: "2025-12-01T10:00:00.000Z",
      },
      organization: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRequestAccountDataExport: () => mocks.accountDataExportMutation,
  useRequestAccountDeactivation: () => mocks.accountDeactivationMutation,
  useListBusinesses: () => ({ data: { businesses: mocks.businesses }, isLoading: false }),
  useListCampaigns: () => ({ data: { campaigns: mocks.campaigns }, isLoading: false }),
  useListCampaignTemplates: () => ({ data: { templates: [] }, isLoading: false }),
  useGetCampaignQr: () => ({
    data: mocks.qrError ? undefined : { redirectPath: "/r/summer" },
    isLoading: false,
    isFetching: false,
    isError: Boolean(mocks.qrError),
    error: mocks.qrError,
    refetch: mocks.qrRefetch,
  }),
   useListKeywords: () => ({ data: { keywords: mocks.keywords }, isLoading: false }),
  useGetPlaceDetails: () => ({ data: undefined, isLoading: false }),
  useGetReviewDashboard: () => ({ data: mocks.reviewDashboard, isLoading: false }),
  useStartReviewProviderConnection: mocks.mutation,
  useDisconnectReviewProvider: mocks.mutation,
  useSyncReviewProvider: mocks.mutation,
  useGetReviewProviderLocations: () => ({ data: undefined, isLoading: false, isError: false }),
  useSelectReviewProviderLocation: mocks.mutation,
  useListManagedReviews: () => ({ data: { reviews: [] }, isLoading: false }),
  useGenerateManagedReviewDraft: mocks.mutation,
  usePublishManagedReviewReply: mocks.mutation,
  useDeleteManagedReviewReply: mocks.mutation,
  useListPrivateFeedback: () => ({ data: { feedback: [] }, isLoading: false }),
  useUpdatePrivateFeedbackStatus: mocks.mutation,
  useCreateBusiness: mocks.mutation,
  useUpdateBusiness: mocks.mutation,
  useDeleteBusiness: mocks.mutation,
  useArchiveBusiness: mocks.mutation,
  useRestoreBusiness: mocks.mutation,
  useSetBusinessStatus: mocks.mutation,
  useCreateCampaign: mocks.mutation,
  useUpdateCampaign: mocks.mutation,
  useDeleteCampaign: mocks.mutation,
  useArchiveCampaign: mocks.mutation,
  useRestoreCampaign: mocks.mutation,
  useSetCampaignStatus: mocks.mutation,
  useCreateKeyword: mocks.mutation,
  useUpdateKeyword: () => mocks.keywordMutation,
  useDeleteKeyword: mocks.mutation,
  getListBusinessesQueryKey: (params: unknown) => ["businesses", params],
  getGetPlaceDetailsQueryKey: (id: string) => ["place-details", id],
  getListCampaignsQueryKey: (params: unknown) => ["campaigns", params],
  getListCampaignTemplatesQueryKey: () => ["campaign-templates"],
  getListKeywordsQueryKey: (id: string) => ["keywords", id],
  getGetCampaignQrQueryKey: (id: string) => ["campaign-qr", id],
  getGetReviewDashboardQueryKey: () => ["review-dashboard"],
  getGetReviewProviderLocationsQueryKey: () => ["review-provider-locations"],
  getListManagedReviewsQueryKey: (params: unknown) => ["managed-reviews", params],
  getListPrivateFeedbackQueryKey: (params: unknown) => ["private-feedback", params],
  KeywordCategory: { PRODUCT_SERVICE: "PRODUCT_SERVICE", EXPERIENCE: "EXPERIENCE" },
  ReviewResponseStatus: { PENDING: "PENDING", DRAFT: "DRAFT", PUBLISHED: "PUBLISHED" },
  PrivateFeedbackStatus: { NEW: "NEW", VIEWED: "VIEWED", RESOLVED: "RESOLVED" },
}));

afterEach(() => {
  cleanup();
  mocks.navigate.mockClear();
  mocks.qrError = null;
  mocks.qrRefetch.mockReset();
  mocks.keywordMutation.mutate.mockReset();
  mocks.keywordMutation.mutateAsync.mockClear();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("authenticated business workspace", () => {
  it("opens the selected business workspace from its business card", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Businesses />);

    await user.click(screen.getByRole("link", { name: "Open Northstar Coffee workspace" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/campaigns?businessId=business-1");
  });

  it("opens the edit details dialog from a business action menu", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Businesses />);

    const businessCard = screen.getByRole("link", { name: "Open Northstar Coffee workspace" });
    await user.click(within(businessCard).getByRole("button"));
    await user.click(await screen.findByRole("menuitem", { name: /Edit Details/i }));

    expect(screen.getByRole("dialog", { name: "Edit Business" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Northstar Coffee")).toBeInTheDocument();
  });

  it("keeps the selected business in every workspace tab", () => {
    render(<BusinessTabs businessId="business-1" businessName="Northstar Coffee" active="campaigns" />);

    expect(screen.getByRole("combobox", { name: "Northstar Coffee workspace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Campaigns/ })).toHaveAttribute(
      "href",
      "/campaigns?businessId=business-1&businessName=Northstar%20Coffee",
    );
    expect(screen.getByRole("link", { name: /Review Inbox/ })).toHaveAttribute(
      "href",
      "/reviews?businessId=business-1&businessName=Northstar%20Coffee",
    );
    expect(screen.getByRole("link", { name: /Feedback/ })).toHaveAttribute(
      "href",
      "/feedback?businessId=business-1&businessName=Northstar%20Coffee",
    );
    expect(screen.queryByText("Northstar Coffee")).not.toBeInTheDocument();
  });

  it("makes the selected business header open the businesses page", async () => {
    window.history.pushState({}, "", "/campaigns?businessId=business-1");
    renderWithQueryClient(<Campaigns />);

    expect(await screen.findByRole("link", { name: "Open Northstar Coffee businesses page" })).toHaveAttribute(
      "href",
      "/businesses",
    );
  });

  it("keeps the selected business after refreshing each tab and navigating back and forward", async () => {
    const workspacePages = [
      { path: "/campaigns?businessId=business-1", Page: Campaigns },
      { path: "/reviews?businessId=business-1", Page: Reviews },
      { path: "/feedback?businessId=business-1", Page: Feedback },
    ];

    for (const { path, Page } of workspacePages) {
      window.history.replaceState({}, "", path);
      const firstRender = renderWithQueryClient(<Page />);
      expect(await screen.findByRole("navigation", { name: "Northstar Coffee workspace" })).toBeInTheDocument();
      firstRender.unmount();

      // A refresh remounts the page at the same URL. The workspace must still
      // resolve to the business encoded in the query string.
      const refreshedRender = renderWithQueryClient(<Page />);
      expect(await screen.findByRole("navigation", { name: "Northstar Coffee workspace" })).toBeInTheDocument();
      refreshedRender.unmount();
    }

    window.history.replaceState({}, "", "/campaigns?businessId=business-1");
    window.history.pushState({}, "", "/reviews?businessId=business-1");

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe("/campaigns"));
    expect(new URLSearchParams(window.location.search).get("businessId")).toBe("business-1");

    window.history.forward();
    await waitFor(() => expect(window.location.pathname).toBe("/reviews"));
    expect(new URLSearchParams(window.location.search).get("businessId")).toBe("business-1");
  });

  it("exposes campaign management and QR actions for every campaign", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/campaigns?businessId=business-1");
    renderWithQueryClient(<Campaigns />);

    expect(await screen.findByText("Summer launch")).toBeInTheDocument();
    expect(screen.getAllByText("Northstar Coffee")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Keywords" })).toHaveLength(mocks.campaigns.length);
    const qrButtons = screen.getAllByRole("button", { name: "QR Code" });
    expect(qrButtons).toHaveLength(mocks.campaigns.length);

    await user.click(qrButtons[0]);

    expect(screen.getByRole("dialog", { name: "QR Code — Summer launch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /PNG/ })).toHaveAttribute(
      "href",
      "/api/v1/campaigns/campaign-1/qr/download/png",
    );
    expect(screen.getByRole("link", { name: /SVG/ })).toHaveAttribute(
      "href",
      "/api/v1/campaigns/campaign-1/qr/download/svg",
    );
    expect(screen.getByRole("link", { name: /PDF/ })).toHaveAttribute(
      "href",
      "/api/v1/campaigns/campaign-1/qr/download/pdf",
    );
    expect(screen.getByRole("link", { name: "Order NFC Standee" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:hello@5-star.ai"),
    );
  });

  it("reorders keywords within their category and persists each new position", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/campaigns?businessId=business-1");
    renderWithQueryClient(<Campaigns />);

    expect(await screen.findByText("Summer launch")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Keywords" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "Keywords — Summer launch" });
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
    };
    fireEvent.dragStart(within(dialog).getByRole("button", { name: "Drag Good Prices to reorder" }), { dataTransfer });
    fireEvent.dragOver(within(dialog).getByRole("button", { name: "Drag Great Selection to reorder" }), { dataTransfer });
    fireEvent.drop(within(dialog).getByRole("button", { name: "Drag Great Selection to reorder" }), { dataTransfer });

    await waitFor(() => expect(mocks.keywordMutation.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mocks.keywordMutation.mutateAsync.mock.calls.map(([input]) => input)).toEqual([
      { id: "keyword-2", data: { sortOrder: 0 } },
      { id: "keyword-1", data: { sortOrder: 1 } },
    ]);
  });

  it("shows a QR download error and lets the owner retry inside the dialog", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "The QR file could not be generated. Please try again." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/campaigns?businessId=business-1");
    renderWithQueryClient(<Campaigns />);

    await user.click((await screen.findAllByRole("button", { name: "QR Code" }))[0]);
    await user.click(screen.getByRole("link", { name: /PNG/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The QR file could not be generated. Please try again.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps Settings and only the top-level three-item sidebar visible", () => {
    render(<Settings />);

    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Businesses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();

    const sidebar = screen.getByRole("navigation");
    expect(within(sidebar).getAllByRole("link")).toHaveLength(3);
    expect(within(sidebar).queryByRole("link", { name: /Campaigns|Review Inbox|Feedback/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Location workspace")).not.toBeInTheDocument();
  });

  it("keeps privacy actions account-scoped and requires explicit deactivation confirmation", async () => {
    const user = userEvent.setup();
    mocks.accountDataExportMutation.mutate.mockClear();
    mocks.accountDeactivationMutation.mutate.mockClear();
    render(<Settings />);

    await user.click(screen.getByTestId("settings-export-button"));
    expect(mocks.accountDataExportMutation.mutate).toHaveBeenCalledWith(
      undefined,
      expect.any(Object),
    );

    await user.click(screen.getByTestId("settings-deactivation-button"));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "does not delete or change business, workspace, team, connection, campaign, or review data",
    );
    const confirmButton = screen.getByTestId("button-confirm-deactivation");
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByTestId("input-deactivation-confirmation"), "DEACTIVATE");
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    expect(mocks.accountDeactivationMutation.mutate).toHaveBeenCalledWith(
      { data: { confirmation: "DEACTIVATE" } },
      expect.any(Object),
    );
  });
});