import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocialMedia from "./SocialMedia";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  comments: [] as Array<{
    id: string;
    authorName: string;
    text: string;
    createdAt: string | null;
    canReply: boolean;
  }>,
  posts: [] as Array<{
    id: string;
    status: string;
    platforms: string[];
    title: string | null;
    caption: string;
    publishedAt: string | null;
    scheduledAt: string | null;
  }>,
  postsLoading: false,
  commentsLoading: false,
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
  const commentsData = { comments: mocks.comments };

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
      isLoading: mocks.postsLoading,
      data: postsData,
    }),
    useListSocialMediaComments: () => ({
      ...queryResult,
      isLoading: mocks.commentsLoading,
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
  mocks.comments.length = 0;
  mocks.posts.length = 0;
  mocks.postsLoading = false;
  mocks.commentsLoading = false;
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
  it("renders an explicit empty queue state for an authenticated business", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("state-no-posts")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-conversations")).toBeInTheDocument();
    expect(screen.getByText("Choose a recent post to see its imported comments here.")).toBeInTheDocument();
  });

  it("renders the post loading state without leaving an empty workspace", async () => {
    mocks.postsLoading = true;

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("state-posts-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("social-conversations")).toBeInTheDocument();
    expect(screen.queryByTestId("state-no-posts")).not.toBeInTheDocument();
  });

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

  it("renders the empty conversation state after choosing a post", async () => {
    mocks.posts.push({
      id: "conversation-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A post with public feedback",
      caption: "Caption",
      publishedAt: null,
      scheduledAt: null,
    });

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("card-post-conversation-post")).toBeInTheDocument();
    });

    await screen.getByTestId("button-import-comments-conversation-post").click();

    await waitFor(() => {
      expect(screen.getByTestId("state-no-comments")).toBeInTheDocument();
    });
  });

  it("renders the conversation loading state after choosing a post", async () => {
    mocks.posts.push({
      id: "loading-conversation-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A post loading public feedback",
      caption: "Caption",
      publishedAt: null,
      scheduledAt: null,
    });
    mocks.commentsLoading = true;

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("card-post-loading-conversation-post")).toBeInTheDocument();
    });

    await screen.getByTestId("button-import-comments-loading-conversation-post").click();

    await waitFor(() => {
      expect(screen.getByTestId("state-comments-loading")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("state-no-comments")).not.toBeInTheDocument();
  });

  it("renders populated conversation content after choosing a post", async () => {
    mocks.posts.push({
      id: "conversation-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A post with public feedback",
      caption: "Caption",
      publishedAt: null,
      scheduledAt: null,
    });
    mocks.comments.push({
      id: "comment-1",
      authorName: "A customer",
      text: "This is useful.",
      createdAt: null,
      canReply: true,
    });

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("card-post-conversation-post")).toBeInTheDocument();
    });

    await screen.getByTestId("button-import-comments-conversation-post").click();

    await waitFor(() => {
      expect(screen.getByTestId("card-comment-comment-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("text-comment-comment-1")).toHaveTextContent("This is useful.");
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