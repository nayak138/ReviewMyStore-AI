import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Businesses from "./Businesses";
import Campaigns from "./Campaigns";
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
      brandColor: "#2563eb",
      logoUrl: null,
      coverImageUrl: null,
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

  return {
    businesses,
    campaigns,
    navigate: vi.fn(),
    mutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut: vi.fn() }),
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
  useListBusinesses: () => ({ data: { businesses: mocks.businesses }, isLoading: false }),
  useListCampaigns: () => ({ data: { campaigns: mocks.campaigns }, isLoading: false }),
  useListCampaignTemplates: () => ({ data: { templates: [] }, isLoading: false }),
  useGetCampaignQr: () => ({ data: { redirectPath: "/r/summer" }, isLoading: false }),
  useListKeywords: () => ({ data: { keywords: [] }, isLoading: false }),
  useGetPlaceDetails: () => ({ data: undefined, isLoading: false }),
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
  useUpdateKeyword: mocks.mutation,
  useDeleteKeyword: mocks.mutation,
  getListBusinessesQueryKey: (params: unknown) => ["businesses", params],
  getGetPlaceDetailsQueryKey: (id: string) => ["place-details", id],
  getListCampaignsQueryKey: (params: unknown) => ["campaigns", params],
  getListCampaignTemplatesQueryKey: () => ["campaign-templates"],
  getListKeywordsQueryKey: (id: string) => ["keywords", id],
  getGetCampaignQrQueryKey: (id: string) => ["campaign-qr", id],
}));

afterEach(() => {
  cleanup();
  mocks.navigate.mockClear();
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

  it("keeps the selected business in every workspace tab", () => {
    render(<BusinessTabs businessId="business-1" businessName="Northstar Coffee" active="campaigns" />);

    expect(screen.getByRole("link", { name: /Campaigns/ })).toHaveAttribute(
      "href",
      "/campaigns?businessId=business-1",
    );
    expect(screen.getByRole("link", { name: /Review Inbox/ })).toHaveAttribute(
      "href",
      "/reviews?businessId=business-1",
    );
    expect(screen.getByRole("link", { name: /Feedback/ })).toHaveAttribute(
      "href",
      "/feedback?businessId=business-1",
    );
    expect(screen.getByText("Northstar Coffee")).toBeInTheDocument();
  });

  it("exposes campaign management and QR actions for every campaign", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/campaigns?businessId=business-1");
    renderWithQueryClient(<Campaigns />);

    expect(await screen.findByText("Summer launch")).toBeInTheDocument();
    expect(screen.getAllByText("Northstar Coffee")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Manage Keywords" })).toHaveLength(mocks.campaigns.length);
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

  it("keeps Settings and only the top-level three-item sidebar visible", () => {
    render(<Settings />);

    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Businesses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();

    const sidebar = screen.getByRole("navigation");
    expect(within(sidebar).getAllByRole("link")).toHaveLength(3);
    expect(within(sidebar).queryByRole("link", { name: /Campaigns|Review Inbox|Feedback/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Location workspace")).not.toBeInTheDocument();
  });
});