import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    dailyUnitCountedToday?: boolean;
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
  importCommentsMutate: vi.fn(),
  replyMutate: vi.fn(),
  attachMutate: vi.fn(),
  attachMutationOptions: undefined as
    | { onError?: (error: unknown, variables: unknown) => void }
    | undefined,
  disconnectMutate: vi.fn(),
  startConnectionMutate: vi.fn(),
  dashboardData: {
    accounts: [] as Array<Record<string, unknown>>,
    availableAccounts: [] as Array<{
      externalAccountId: string;
      platform: "FACEBOOK" | "INSTAGRAM" | "THREADS";
      displayName: string;
      username: string | null;
      profileUrl: string | null;
      connected: boolean;
    }>,
    usage: [
      {
        metric: "SOCIAL_POSTS",
        label: "Social posts",
        window: "DAILY",
        used: 2,
        reserved: 1,
    limit: 10,
    remaining: 7,
        periodEnd: "2026-08-21T00:00:00Z",
      },
    ] as Array<Record<string, unknown>>,
    usageHistory: [] as Array<Record<string, unknown>>,
  },
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
      data: mocks.dashboardData,
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
    useAttachSocialMediaAccount: (options?: {
      mutation?: { onError?: (error: unknown, variables: unknown) => void };
    }) => {
      mocks.attachMutationOptions = options?.mutation;
      return { mutate: mocks.attachMutate, isPending: false };
    },
    useDisconnectSocialMediaConnection: () => ({ mutate: mocks.disconnectMutate, isPending: false }),
    useCreateSocialMediaPost: () => ({ mutate: vi.fn(), isPending: false }),
    useDetachSocialMediaAccount: () => ({ mutate: vi.fn(), isPending: false }),
    useImportSocialMediaComments: () => ({ mutate: mocks.importCommentsMutate, isPending: false }),
    useReplyToSocialMediaComment: () => ({ mutate: mocks.replyMutate, isPending: false }),
    useRequestSocialMediaMediaUploadUrl: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useStartSocialMediaConnection: () => ({ mutate: mocks.startConnectionMutate, isPending: false }),
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
  mocks.dashboardData.accounts.length = 0;
  mocks.dashboardData.availableAccounts.length = 0;
  mocks.dashboardData.usage = [{
    metric: "SOCIAL_POSTS",
    label: "Social posts",
    window: "DAILY",
    used: 2,
    reserved: 1,
    limit: 10,
    remaining: 7,
    nearLimit: false,
    warningThresholdPercent: 80,
    periodStart: "2026-08-20T00:00:00Z",
    periodEnd: "2026-08-21T00:00:00Z",
  }];
  mocks.importCommentsMutate.mockClear();
  mocks.replyMutate.mockClear();
  mocks.attachMutate.mockClear();
  mocks.attachMutationOptions = undefined;
  mocks.disconnectMutate.mockClear();
  mocks.startConnectionMutate.mockClear();
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

  it("attaches the newly authorized Page to the selected business", async () => {
    mocks.dashboardData.availableAccounts.push({
      externalAccountId: "facebook-page-new",
      platform: "FACEBOOK",
      displayName: "New Facebook Page",
      username: "new-page",
      profileUrl: null,
      connected: false,
    });
    window.history.replaceState(
      {},
      "",
      "/social-media?businessId=business-1&socialConnect=1",
    );

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("select-account-facebook")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("select-account-facebook"));
    await waitFor(() => {
      expect(screen.getByTestId("option-account-facebook-page-new")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-account-facebook-page-new"));

    expect(mocks.attachMutate).toHaveBeenCalledWith({
      data: {
        businessId: "business-1",
        externalAccountId: "facebook-page-new",
      },
    });
  });

  it("shows recoverable feedback when the selected Page disappeared", async () => {
    mocks.dashboardData.availableAccounts.push({
      externalAccountId: "facebook-page-removed",
      platform: "FACEBOOK",
      displayName: "Removed Facebook Page",
      username: null,
      profileUrl: null,
      connected: false,
    });
    mocks.attachMutate.mockImplementation((input) => {
      mocks.attachMutationOptions?.onError?.(
        new Error(
          "That Page or account is no longer available. Refresh the available Meta targets and choose again.",
        ),
        input,
      );
    });

    renderSocialMedia();
    await waitFor(() => {
      expect(screen.getByTestId("select-account-facebook")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("select-account-facebook"));
    await waitFor(() => {
      expect(screen.getByTestId("option-account-facebook-page-removed")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-account-facebook-page-removed"));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "That Page is no longer available",
        description:
          "That Page or account is no longer available. Refresh the available Meta targets and choose again.",
        variant: "destructive",
      });
    });
  });

  it("keeps the current channel while opening a replacement chooser", async () => {
    mocks.dashboardData.accounts.push({
      id: "connected-facebook",
      platform: "FACEBOOK",
      displayName: "Current Facebook Page",
      username: "current-page",
    });
    mocks.dashboardData.availableAccounts.push({
      externalAccountId: "replacement-facebook-page",
      platform: "FACEBOOK",
      displayName: "Replacement Facebook Page",
      username: "replacement-page",
      profileUrl: null,
      connected: false,
    });

    renderSocialMedia();
    await waitFor(() => {
      expect(screen.getByTestId("button-switch-account-connected-facebook")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("button-switch-account-connected-facebook"));

    expect(mocks.disconnectMutate).not.toHaveBeenCalled();
    expect(mocks.startConnectionMutate).toHaveBeenCalledWith({
      data: { businessId: "business-1", platform: "FACEBOOK" },
    });
    expect(screen.getByTestId("select-account-facebook")).toBeInTheDocument();
  });
});

describe("workspace layout", () => {
  it("shows precise usage and manual billing context while preserving channel and publishing controls", async () => {
    renderSocialMedia();

    expect(await screen.findByTestId("social-composer")).toBeInTheDocument();
    expect(screen.getByTestId("social-usage")).toBeInTheDocument();
    expect(screen.getByTestId("social-billing-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("social-reconnect-guide")).not.toBeInTheDocument();
    expect(screen.queryByText("About media")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Select an available Page or profile to attach it/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connected channels" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add a channel" })).toBeInTheDocument();
    expect(screen.getByTestId("button-publish-post")).toBeInTheDocument();
  });

  it("blocks publishing at the daily post cap with a focusable explanation", async () => {
    mocks.dashboardData.usage = [{
      metric: "SOCIAL_POSTS",
      label: "Social posts",
      window: "DAILY",
      used: 10,
      reserved: 0,
      limit: 10,
      remaining: 0,
      nearLimit: true,
      warningThresholdPercent: 80,
      periodStart: "2026-08-20T00:00:00Z",
      periodEnd: "2026-08-21T00:00:00Z",
    }];

    renderSocialMedia();

    const publish = await screen.findByTestId("button-publish-post");
    expect(publish).toBeDisabled();
    expect(screen.getByTestId("button-publish-post-notice")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("button-publish-post-notice")).toHaveAccessibleName(/daily social post allowance/i);
    expect(screen.getByTestId("notice-publish-post")).toHaveTextContent(/daily social post allowance/i);
  });

  it("blocks a cross-post when its destination count exceeds remaining daily post units", async () => {
    mocks.dashboardData.accounts.push(
      { id: "connected-facebook", platform: "FACEBOOK", displayName: "Facebook Page", username: "page" },
      { id: "connected-threads", platform: "THREADS", displayName: "Threads Profile", username: "profile" },
    );
    mocks.dashboardData.usage = [{
      metric: "SOCIAL_POSTS",
      label: "Social posts",
      window: "DAILY",
      used: 9,
      reserved: 0,
      limit: 10,
      remaining: 1,
      nearLimit: true,
      warningThresholdPercent: 80,
      periodStart: "2026-08-20T00:00:00Z",
      periodEnd: "2026-08-21T00:00:00Z",
    }];

    renderSocialMedia();
    await screen.findByTestId("button-select-platform-facebook");
    fireEvent.click(screen.getByTestId("button-select-platform-facebook"));
    fireEvent.click(screen.getByTestId("button-select-platform-threads"));

    expect(screen.getByTestId("button-publish-post")).toBeDisabled();
    expect(screen.getByTestId("notice-publish-post")).toHaveTextContent(/uses 2 daily post units, but only 1 remain/i);
  });

  it("blocks comment imports and replies at the daily comment-unit cap", async () => {
    mocks.posts.push({
      id: "daily-comment-cap",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A live post",
      caption: "A live post",
      publishedAt: "2026-09-22T00:00:00Z",
      scheduledAt: null,
    });
    mocks.comments.push({
      id: "daily-comment-cap-item",
      authorName: "A customer",
      text: "A comment that could be replied to",
      createdAt: null,
      canReply: true,
      dailyUnitCountedToday: false,
    });
    mocks.dashboardData.usage = [{
      metric: "SOCIAL_COMMENT_DAILY_UNITS",
      label: "Daily comment units",
      window: "DAILY",
      used: 5,
      reserved: 0,
      limit: 5,
      remaining: 0,
      nearLimit: true,
      warningThresholdPercent: 80,
      periodStart: "2026-09-22T00:00:00Z",
      periodEnd: "2026-09-23T00:00:00Z",
    }];

    renderSocialMedia();
    const importButton = await screen.findByTestId("button-import-comments-daily-comment-cap");
    const replyButton = await screen.findByTestId("button-reply-comment-daily-comment-cap-item");

    expect(importButton).toBeDisabled();
    expect(screen.getByTestId("button-import-comments-daily-comment-cap-notice")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("notice-import-comments-daily-comment-cap")).toHaveTextContent(/daily comment-unit allowance/i);
    expect(replyButton).toBeDisabled();
    expect(screen.getByTestId("button-reply-comment-daily-comment-cap-item-notice")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("notice-reply-comment-daily-comment-cap-item")).toHaveTextContent(/daily comment-unit allowance/i);
  });

  it("keeps a same-day imported comment reply available at the cap", async () => {
    mocks.posts.push({
      id: "same-day-comment-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A live post",
      caption: "A live post",
      publishedAt: "2026-09-22T00:00:00Z",
      scheduledAt: null,
    });
    mocks.comments.push({
      id: "same-day-comment",
      authorName: "A customer",
      text: "Already counted today",
      createdAt: null,
      canReply: true,
      dailyUnitCountedToday: true,
    });
    mocks.dashboardData.usage = [{
      metric: "SOCIAL_COMMENT_DAILY_UNITS",
      label: "Comment units today",
      window: "DAILY",
      used: 5,
      reserved: 0,
      limit: 5,
      remaining: 0,
      nearLimit: true,
      warningThresholdPercent: 80,
      periodStart: "2026-09-22T00:00:00Z",
      periodEnd: "2026-09-23T00:00:00Z",
    }];

    renderSocialMedia();
    const replyButton = await screen.findByTestId("button-reply-comment-same-day-comment");
    fireEvent.change(screen.getByTestId("textarea-reply-same-day-comment"), {
      target: { value: "Thanks for sharing!" },
    });
    expect(replyButton).toBeEnabled();
    expect(screen.queryByTestId("notice-reply-comment-same-day-comment")).not.toBeInTheDocument();
  });

  it("blocks media selection at the daily upload cap with accessible guidance", async () => {
    mocks.dashboardData.usage = [{
      metric: "SOCIAL_MEDIA_UPLOADS",
      label: "Daily media uploads",
      window: "DAILY",
      used: 100,
      reserved: 0,
      limit: 100,
      remaining: 0,
      nearLimit: true,
      warningThresholdPercent: 80,
      periodStart: "2026-09-22T00:00:00Z",
      periodEnd: "2026-09-23T00:00:00Z",
    }];

    renderSocialMedia();
    expect(await screen.findByTestId("button-add-post-media")).toBeDisabled();
    expect(screen.getByTestId("input-post-media")).toBeDisabled();
    expect(screen.getByTestId("button-add-post-media-notice")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("notice-add-post-media")).toHaveTextContent(/daily media upload allowance/i);
  });

  it("does not hard-stop comment imports or media uploads when only monthly bases are exceeded", async () => {
    mocks.posts.push({
      id: "monthly-overage-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "Monthly overage post",
      caption: "A live post",
      publishedAt: "2026-09-22T00:00:00Z",
      scheduledAt: null,
    });
    mocks.dashboardData.usage = [
      {
        metric: "SOCIAL_POSTS",
        label: "Social posts",
        window: "DAILY",
        used: 1,
        reserved: 0,
        limit: 10,
        remaining: 9,
        nearLimit: false,
        warningThresholdPercent: 80,
        periodStart: "2026-09-20T00:00:00Z",
        periodEnd: "2026-09-21T00:00:00Z",
      },
      {
        metric: "SOCIAL_COMMENT_DAILY_UNITS",
        label: "Daily comment units",
        window: "DAILY",
        used: 1,
        reserved: 0,
        limit: 5,
        remaining: 4,
        nearLimit: false,
        warningThresholdPercent: 80,
        periodStart: "2026-09-20T00:00:00Z",
        periodEnd: "2026-09-21T00:00:00Z",
      },
      {
        metric: "SOCIAL_COMMENT_IMPORTS",
        label: "Monthly comment imports",
        window: "MONTHLY",
        used: 30,
        reserved: 0,
        limit: 25,
        remaining: 0,
        nearLimit: true,
        warningThresholdPercent: 80,
        periodStart: "2026-09-01T00:00:00Z",
        periodEnd: "2026-10-01T00:00:00Z",
      },
      {
        metric: "SOCIAL_MEDIA_UPLOADS",
        label: "Daily media uploads",
        window: "DAILY",
        used: 2,
        reserved: 0,
        limit: 100,
        remaining: 98,
        nearLimit: false,
        warningThresholdPercent: 80,
        periodStart: "2026-09-20T00:00:00Z",
        periodEnd: "2026-09-21T00:00:00Z",
      },
      {
        metric: "SOCIAL_MEDIA_UPLOADS_MONTHLY",
        label: "Monthly media uploads",
        window: "MONTHLY",
        used: 550,
        reserved: 0,
        limit: 500,
        remaining: 0,
        nearLimit: true,
        warningThresholdPercent: 80,
        periodStart: "2026-09-01T00:00:00Z",
        periodEnd: "2026-10-01T00:00:00Z",
      },
    ];

    renderSocialMedia();

    expect(await screen.findByTestId("button-import-selected-comments")).toBeEnabled();
    expect(screen.getByTestId("button-add-post-media")).toBeEnabled();
    expect(screen.getByTestId("social-usage-summary-warning")).toBeInTheDocument();
    expect(screen.getByTestId("usage-metric-social_comment_imports")).toHaveTextContent("5 over base");
    expect(screen.getByTestId("usage-metric-social_media_uploads_monthly")).toHaveTextContent("50 over base");
  });

  it("renders an explicit empty queue state for an authenticated business", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("state-no-posts")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-content-grid")).toBeInTheDocument();
    expect(screen.getByTestId("social-channel-grid")).toHaveClass("lg:grid-cols-2");
    expect(screen.getByTestId("social-reply-desk")).toBeInTheDocument();
    expect(screen.getByTestId("social-content-grid")).toHaveClass("lg:grid-cols-2", "items-stretch");
    expect(screen.getByTestId("social-composer")).toHaveClass("lg:col-start-2", "lg:row-start-1", "lg:row-span-2");
    expect(screen.getByTestId("social-recent-queue")).toHaveClass("lg:col-start-1", "lg:row-start-1");
    expect(screen.getByTestId("social-reply-desk")).toHaveClass("lg:col-start-1", "lg:row-start-2");
    expect(screen.getByTestId("social-content-grid")).toHaveClass("min-w-0");
    expect(screen.queryByText("Public conversations")).not.toBeInTheDocument();
    expect(screen.getByText("Publish a post first to bring its public comments into this desk.")).toBeInTheDocument();
  });

  it("keeps the channel picker and composer controls wrap-safe on narrow screens", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("social-composer")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-workspace")).toHaveClass("w-full", "min-w-0");
    expect(screen.getByTestId("social-composer")).toHaveClass("min-w-0");
    expect(screen.getByTestId("social-recent-queue")).toHaveClass("min-w-0");
    expect(screen.getByTestId("social-reply-desk")).toHaveClass("min-w-0");
    expect(screen.getByTestId("select-comment-post")).toHaveClass("min-w-0");
  });

  it.each(["phone", "tablet"])(
    "keeps available account controls inside the channel row at %s width",
    async () => {
      mocks.dashboardData.availableAccounts.push({
        externalAccountId: "facebook-page-1",
        platform: "FACEBOOK",
        displayName: "Test Facebook Page",
        username: "test-page",
        profileUrl: null,
        connected: false,
      });

      renderSocialMedia();

      await waitFor(() => {
        expect(screen.getByTestId("select-account-facebook")).toBeInTheDocument();
      });

    const channelRow = screen.getByTestId("row-connect-facebook");
      const accountSelector = within(channelRow).getByTestId("select-account-facebook");
      const reconnectAccess = within(channelRow).getByTestId("button-reconnect-access-facebook");
      const accountControls = accountSelector.parentElement;

      expect(channelRow).toContainElement(accountSelector);
      expect(channelRow).toContainElement(reconnectAccess);
      expect(accountControls).toHaveClass("mt-3", "flex", "min-w-0", "flex-col", "pl-8", "sm:flex-row");
      expect(accountSelector).toHaveClass(
        "min-w-0",
        "w-full",
        "flex-1",
      );
      expect(reconnectAccess).toHaveClass("shrink-0");
      expect(screen.queryByTestId("button-connect-facebook")).not.toBeInTheDocument();
    },
  );

  it("clears the provider session before starting a reconnect", async () => {
    mocks.dashboardData.availableAccounts.push({
      externalAccountId: "facebook-page-1",
      platform: "FACEBOOK",
      displayName: "Test Facebook Page",
      username: "test-page",
      profileUrl: null,
      connected: false,
    });

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("button-reconnect-access-facebook")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("button-reconnect-access-facebook"));

    expect(mocks.disconnectMutate).toHaveBeenCalledWith(
      { data: { businessId: "business-1", platform: "FACEBOOK" } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const [, callbacks] = mocks.disconnectMutate.mock.calls[0];
    callbacks.onSuccess();

    expect(mocks.startConnectionMutate).toHaveBeenCalledWith({
      data: { businessId: "business-1", platform: "FACEBOOK" },
    });
  });

  it("keeps the Connect action when no provider accounts are available", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("button-connect-facebook")).toBeInTheDocument();
    });

    const channelRow = screen.getByTestId("row-connect-facebook");
    expect(within(channelRow).getByTestId("button-connect-facebook")).toHaveTextContent("Connect");
    expect(within(channelRow).queryByTestId("select-account-facebook")).not.toBeInTheDocument();
    expect(within(channelRow).queryByTestId("button-reconnect-access-facebook")).not.toBeInTheDocument();
  });

  it("renders the post loading state without leaving an empty workspace", async () => {
    mocks.postsLoading = true;

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("state-posts-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("social-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("social-content-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("state-no-posts")).not.toBeInTheDocument();
  });

  it("lets the workspace size to its content instead of forcing full-viewport height", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("social-workspace")).toBeInTheDocument();
      expect(screen.getByTestId("social-content-grid")).toBeInTheDocument();
    });

    // The parent app shell owns the single page-level scroll container. The
    // workspace and its sections must not force extra height (which used to
    // leave blank scrollable space below the content).
    expect(screen.getByTestId("social-workspace")).not.toHaveClass(
      "min-h-full",
      "lg:min-h-[calc(100dvh-4rem)]",
    );
    expect(screen.getByTestId("social-content-grid")).not.toHaveClass(
      "flex-1",
      "lg:min-h-0",
    );
  });

  it("blurs the native schedule picker after capturing the selected date and time", async () => {
    renderSocialMedia();

    const scheduleToggle = await screen.findByTestId("button-toggle-schedule");
    await scheduleToggle.click();

    const scheduleInput = screen.getByTestId("input-scheduled-at");
    const blurSpy = vi.spyOn(scheduleInput, "blur");
    fireEvent.change(scheduleInput, { target: { value: "2026-09-23T16:31" } });

    expect(scheduleInput).toHaveValue("2026-09-23T16:31");
    expect(blurSpy).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId("social-content-grid")).toBeInTheDocument();
  });

  it("keeps the reply desk as a separate keyboard-focusable bounded region", async () => {
    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("comment-desk-scroll")).toBeInTheDocument();
    });

    const replyDesk = screen.getByTestId("comment-desk-scroll");
    expect(replyDesk).toHaveAttribute("role", "region");
    expect(replyDesk).toHaveAttribute("tabindex", "0");
    expect(replyDesk).toHaveAttribute("aria-label", "Scrollable reply desk");
    expect(replyDesk).toHaveClass(
      "overflow-y-auto",
      "overscroll-contain",
      "max-h-[min(36rem,calc(100dvh-16rem))]",
    );
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

  it("sends the selected post channel when importing comments", async () => {
    mocks.posts.push({
      id: "multi-channel-post",
      status: "POSTED",
      platforms: ["FACEBOOK", "INSTAGRAM"],
      title: "A live multi-channel post",
      caption: "Caption",
      publishedAt: "2026-09-22T00:00:00.000Z",
      scheduledAt: null,
    });

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("button-import-selected-comments")).toBeInTheDocument();
    });

    await screen.getByTestId("button-import-selected-comments").click();
    expect(mocks.importCommentsMutate).toHaveBeenCalledWith({
      data: {
        businessId: "business-1",
        postId: "multi-channel-post",
        platform: "FACEBOOK",
      },
    });
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
    expect(queue).toHaveClass("overflow-y-auto");
    expect(queue).toHaveAttribute("role", "region");
    expect(queue).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("state-no-comments")).toBeInTheDocument();
  });

  it("keeps reply loading scoped to the comment being submitted", async () => {
    mocks.posts.push({
      id: "reply-post",
      status: "PUBLISHED",
      platforms: ["FACEBOOK"],
      title: "A post with two replies",
      caption: "Caption",
      publishedAt: null,
      scheduledAt: null,
    });
    mocks.comments.push(
      {
        id: "comment-1",
        authorName: "First customer",
        text: "First comment",
        createdAt: null,
        canReply: true,
      },
      {
        id: "comment-2",
        authorName: "Second customer",
        text: "Second comment",
        createdAt: null,
        canReply: true,
      },
    );

    renderSocialMedia();

    await waitFor(() => {
      expect(screen.getByTestId("button-reply-comment-comment-1")).toBeInTheDocument();
    });

    const firstDraft = screen.getByTestId("textarea-reply-comment-1");
    fireEvent.change(firstDraft, { target: { value: "Thanks for sharing!" } });
    await screen.getByTestId("button-reply-comment-comment-1").click();

    expect(mocks.replyMutate).toHaveBeenCalledWith({
      id: "comment-1",
      data: { businessId: "business-1", text: "Thanks for sharing!" },
    });
    expect(screen.getByTestId("button-reply-comment-comment-1")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-reply-comment-comment-2")).not.toHaveAttribute("aria-busy", "true");
  });
});
