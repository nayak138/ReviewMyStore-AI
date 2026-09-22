import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SocialMedia from "./SocialMedia";
import "../index.css";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => {
  const posts = Array.from({ length: 6 }, (_, index) => ({
    id: `post-${index}`,
    status: "PUBLISHED",
    platforms: ["FACEBOOK"],
    title: `Post ${index}`,
    caption: `A useful customer update ${index}`,
    publishedAt: "2026-09-22T00:00:00.000Z",
    scheduledAt: null,
  }));
  const comments = [
    {
      id: "comment-1",
      authorName: "A customer",
      text: "This is useful.",
      createdAt: "2026-09-22T00:00:00.000Z",
      canReply: true,
    },
  ];
  const dashboardData = {
    accounts: [
      {
        id: "account-1",
        platform: "FACEBOOK",
        displayName: "Test Facebook Page",
        username: "test-page",
        profileUrl: null,
      },
    ],
    availableAccounts: [],
  };

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
      data: { businesses: [{ id: "business-1", name: "Test Business", address: null }] },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
    useGetSocialMediaDashboard: () => ({
      data: dashboardData,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
    useListSocialMediaPosts: () => ({
      data: { posts },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
    useListSocialMediaComments: () => ({
      data: { comments },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
    useAttachSocialMediaAccount: () => ({ mutate: vi.fn(), isPending: false }),
    useDisconnectSocialMediaConnection: () => ({ mutate: vi.fn(), isPending: false }),
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

/**
 * Reusable signed-in browser fixture. Keeping auth and API state here makes
 * viewport checks deterministic without requiring a live Clerk session.
 */
export function renderAuthenticatedSocialMediaWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SocialMedia />
    </QueryClientProvider>,
  );
}

function rect(element: HTMLElement) {
  return element.getBoundingClientRect();
}

async function openWorkspace() {
  renderAuthenticatedSocialMediaWorkspace();
  await waitFor(() => {
    expect(screen.getByTestId("social-workspace")).toBeVisible();
  });
}

afterEach(() => {
  cleanup();
});

describe("authenticated Social Media viewport checks", () => {
  it("opens the composer and verifies queue/reply placement at each viewport", async () => {
    await openWorkspace();

    const composer = rect(screen.getByTestId("social-composer"));
    const queue = rect(screen.getByTestId("social-recent-queue"));
    const replyDesk = rect(screen.getByTestId("social-reply-desk"));
    const contentGrid = screen.getByTestId("social-content-grid");
    expect(
      Array.from(contentGrid.children).map((child) => child.getAttribute("data-testid")),
    ).toEqual(["social-composer", "social-recent-queue", "social-reply-desk"]);
    if (getComputedStyle(contentGrid).display !== "grid") {
      expect(contentGrid).toHaveClass("grid", "min-w-0");
      expect(screen.getByTestId("social-composer")).toHaveClass("min-w-0");
      expect(screen.getByTestId("social-recent-queue")).toHaveClass("min-w-0");
      expect(screen.getByTestId("social-reply-desk")).toHaveClass("min-w-0");
      return;
    }
    const isDesktop = window.innerWidth >= 1280;

    expect(composer.width).toBeGreaterThan(0);
    expect(queue.width).toBeGreaterThan(0);
    expect(replyDesk.width).toBeGreaterThan(0);

    if (isDesktop) {
      expect(composer.left).toBeGreaterThan(queue.left);
      expect(composer.top).toBeLessThan(queue.bottom);
      expect(replyDesk.top).toBeGreaterThan(queue.top);
      expect(replyDesk.left).toBeLessThan(composer.left);
    } else {
      expect(composer.top).toBeLessThan(queue.top);
      expect(queue.bottom).toBeLessThan(replyDesk.top);
      expect(composer.left).toBe(queue.left);
      expect(queue.left).toBe(replyDesk.left);
    }
  });

  it("has no horizontal page overflow or clipped interactive controls", async () => {
    await openWorkspace();

    const viewportWidth = document.documentElement.clientWidth;
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(viewportWidth);
    expect(document.body.scrollWidth).toBeLessThanOrEqual(viewportWidth);

    const contentGrid = screen.getByTestId("social-content-grid");
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, input:not([data-testid='input-post-media']), textarea, [role='combobox']",
      ),
    ).filter((control) => {
      return getComputedStyle(contentGrid).display !== "grid" || control.getClientRects().length > 0;
    });

    expect(controls.length).toBeGreaterThan(0);
    if (getComputedStyle(contentGrid).display !== "grid") {
      expect(contentGrid).toHaveClass("grid", "min-w-0");
      return;
    }
    for (const control of controls) {
      const controlRect = rect(control);
      expect(controlRect.width, `${control.tagName} should have a visible width`).toBeGreaterThan(0);
      expect(controlRect.left, `${control.tagName} is clipped on the left`).toBeGreaterThanOrEqual(0);
      expect(controlRect.right, `${control.tagName} is clipped on the right`).toBeLessThanOrEqual(
        window.innerWidth,
      );
    }
  });
});