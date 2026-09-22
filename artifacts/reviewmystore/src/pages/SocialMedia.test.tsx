import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocialMedia from "./SocialMedia";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  posts: [] as Array<{
    id: string;
    status: string;
    platforms: string[];
    title: string | null;
    caption: string;
    publishedAt: string | null;
    scheduledAt: string | null;
  }>,
}));

vi.mock("@workspace/api-client-react", () => {
  const queryResult = {
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  const businessesData = {
    businesses: [{ id: "business-1", name: "Test Business", address: null }],
  };
  const dashboardData = { accounts: [], availableAccounts: [] };
  const postsData = { posts: mocks.posts };
  const commentsData = { comments: [] };

  return {
    SocialMediaPlatform: {
      FACEBOOK: "FACEBOOK",
      INSTAGRAM: "INSTAGRAM",
      THREADS: "THREADS",
    },
    getGetSocialMediaDashboardQueryKey: ({ businessId }: { businessId: string }) => [
      "/api/social-media/dashboard",
      businessId,
    ],
    getListBusinessesQueryKey: () => ["/api/businesses"],
    getListSocialMediaCommentsQueryKey: ({
      businessId,
      postId,
    }: {
      businessId: string;
      postId?: string;
    }) => ["/api/social-media/comments", businessId, postId],
    getListSocialMediaPostsQueryKey: ({ businessId }: { businessId: string }) => [
      "/api/social-media/posts",
      businessId,
    ],
    useListBusinesses: () => ({
      ...queryResult,
      data: businessesData,
    }),
    useGetSocialMediaDashboard: () => ({
      ...queryResult,
      data: dashboardData,
    }),
    useListSocialMediaPosts: () => ({
      ...queryResult,
      data: postsData,
    }),
    useListSocialMediaComments: () => ({
      ...queryResult,
      data: commentsData,
    }),
    useAttachSocialMediaAccount: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateSocialMediaPost: () => ({ mutate: vi.fn(), isPending: false }),
    useDetachSocialMediaAccount: () => ({ mutate: vi.fn(), isPending: false }),
    useImportSocialMediaComments: () => ({ mutate: vi.fn(), isPending: false }),
    useReplyToSocialMediaComment: () => ({ mutate: vi.fn(), isPending: false }),
    useRequestSocialMediaMediaUploadUrl: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useStartSocialMediaConnection: () => ({ mutate: vi.fn(), isPending: false }),
    useFinalizeUpload: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/business/business-tabs", () => ({
  BusinessTabs: () => null,
}));

function renderSocialMedia() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <SocialMedia />
    </QueryClientProvider>,
  );

  return { invalidateSpy };
}

function callbackParams() {
  return new URLSearchParams(window.location.search);
}

beforeEach(() => {
  mocks.toast.mockClear();
  mocks.posts.length = 0;
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("Meta callback recovery", () => {
  it("shows recovery feedback without a false success message after denial", async () => {
    window.history.replaceState(
      {},
      "",
      "/social-media?businessId=business-1&socialConnect=1&error=access_denied",
    );

    const { invalidateSpy } = renderSocialMedia();

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Social authorization wasn't completed",
        description: "No account was connected. You can try again when you're ready.",
        variant: "destructive",
      });
    });

    expect(
      mocks.toast.mock.calls.some(
        ([toast]) => toast.title === "Social account authorized",
      ),
    ).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/social-media/dashboard", "business-1"],
    });

    const params = callbackParams();
    expect(params.get("businessId")).toBe("business-1");
    expect(params.has("socialConnect")).toBe(false);
    expect(params.has("error")).toBe(false);
  });

  it("shows the account-selection prompt and refreshes the selected business after success", async () => {
    window.history.replaceState(
      {},
      "",
      "/social-media?businessId=business-1&socialConnect=1",
    );

    const { invalidateSpy } = renderSocialMedia();

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Social account authorized",
        description: "Choose the Page or account you want this business to publish to.",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/social-media/dashboard", "business-1"],
    });

    const params = callbackParams();
    expect(params.get("businessId")).toBe("business-1");
    expect(params.has("socialConnect")).toBe(false);
    expect(params.has("error")).toBe(false);
  });
});

describe("workspace layout", () => {
  it("gives the conversation area the remaining desktop workspace height", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("social-workspace")).toBeInTheDocument();
      expect(screen.getByTestId("social-conversations")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-workspace")).toHaveClass(
      "lg:min-h-[calc(100dvh-4rem)]",
    );
    expect(screen.getByTestId("social-conversations")).toHaveClass(
      "flex-1",
      "lg:min-h-0",
    );
  });

  it("keeps a long post queue in a focusable scroll region", async () => {
    mocks.posts.push(
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `post-${index}`,
        status: "PUBLISHED",
        platforms: ["FACEBOOK"],
        title: `Post ${index}`,
        caption: `Caption ${index}`,
        publishedAt: null,
        scheduledAt: null,
      })),
    );

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("post-queue-scroll")).toBeInTheDocument();
    });

    const queue = screen.getByTestId("post-queue-scroll");
    expect(queue).toHaveAttribute("role", "region");
    expect(queue).toHaveAttribute("tabindex", "0");
    expect(queue).toHaveAttribute("aria-label", "Scrollable recent post queue");
    expect(queue).toHaveClass(
      "overflow-y-auto",
      "overscroll-contain",
      "max-h-[min(36rem,calc(100dvh-12rem))]",
    );
    expect(screen.getByTestId("social-conversations")).toBeInTheDocument();
  });

  it("keeps a short post queue in the regular page flow", async () => {
    mocks.posts.push(
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `short-post-${index}`,
        status: "PUBLISHED",
        platforms: ["FACEBOOK"],
        title: `Post ${index}`,
        caption: `Caption ${index}`,
        publishedAt: null,
        scheduledAt: null,
      })),
    );

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("post-queue-scroll")).toBeInTheDocument();
    });

    const queue = screen.getByTestId("post-queue-scroll");
    expect(queue).not.toHaveClass("overflow-y-auto");
    expect(queue).not.toHaveAttribute("role");
    expect(screen.getByTestId("state-no-comments")).toBeInTheDocument();
  });
});