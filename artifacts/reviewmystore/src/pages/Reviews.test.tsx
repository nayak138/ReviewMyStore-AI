import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Reviews, { ReviewItem } from './Reviews';

/**
 * Covers two independent surfaces of the review inbox:
 *
 *  - ReviewItem: an AI draft (or a manually edited reply) can never be
 *    published without the explicit confirmation dialog being accepted
 *    first, and sensitive-review warnings stay visible throughout.
 *  - Reviews (the page): the dashboard renders the "Connection Pending"
 *    state (no Google account selected yet) vs the full "Review Inbox"
 *    state (CONNECTED) correctly -- regression coverage for the connect
 *    flow provider rewrite (Zernio -> bundle.social).
 */

const mocks = vi.hoisted(() => ({
  publishMutate: vi.fn(),
  generateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  startConnectionMutate: vi.fn(),
  disconnectMutate: vi.fn(),
  syncMutate: vi.fn(),
  selectLocationMutate: vi.fn(),
  dashboardStatus: 'PENDING' as 'DISCONNECTED' | 'PENDING' | 'CONNECTED',
  providerRemainingImportCapacity: 200,
  businessImportUsage: { used: 3, reserved: 1, limit: 200, remaining: 196, nearLimit: false },
  callbackStage: null as null | 'NOT_CONNECTED' | 'NEEDS_LOCATION' | 'NO_LOCATIONS_FOUND' | 'READY',
  callbackLocations: [] as Array<{ id: string; name: string; address: string | null }>,
}));

vi.mock('@workspace/api-client-react', () => ({
  getGetCurrentUserQueryKey: () => ['/api/auth/me'],
  useGetCurrentUser: () => ({
    data: { user: { role: 'OWNER' }, teamAccess: [] },
    isLoading: false,
  }),
  useGetReviewDashboard: () => ({
    data: {
      connection: {
        status: mocks.dashboardStatus,
        provider: 'BNDLE',
        lastSyncedAt: mocks.dashboardStatus === 'CONNECTED' ? '2026-08-20T00:00:00Z' : null,
        lastError: null,
        remainingImportCapacity: mocks.providerRemainingImportCapacity,
      },
      locations:
        mocks.dashboardStatus === 'CONNECTED'
          ? [{ id: 'loc-1', name: 'Test Business', address: null, category: null, websiteUrl: null, isSelected: true }]
          : [],
      summary: { totalReviews: 3, needsReply: 1, replied: 2 },
      usage: [
        {
          metric: 'GOOGLE_REVIEW_IMPORTS',
          label: 'Google review imports',
          window: 'MONTHLY',
          ...mocks.businessImportUsage,
          limit: 200,
          warningThresholdPercent: 80,
          periodStart: '2026-09-01T00:00:00Z',
          periodEnd: '2026-09-30T00:00:00Z',
        },
      ],
      usageHistory: [],
    },
    isLoading: false,
  }),
  getGetReviewDashboardQueryKey: () => ['/api/review-management'],
  useListBusinesses: () => ({
    data: {
      businesses: [
        {
          id: 'business-1',
          name: 'Test Business',
          address: null,
        },
      ],
    },
    isLoading: false,
  }),
  getListBusinessesQueryKey: () => ['/api/businesses'],
  // Mimics the real mutation hook closely enough to exercise the
  // connect-flow regression below: calling `mutate()` synchronously invokes
  // the caller's `onSuccess` with a fake bundle.social portal response, just
  // like react-query would once the request resolves.
  useStartReviewProviderConnection: (config?: {
    mutation?: {
      onSuccess?: (data: {
        authUrl: string | null;
        stage: 'NOT_CONNECTED' | 'NEEDS_LOCATION' | 'NO_LOCATIONS_FOUND' | 'READY';
        locations: unknown[];
      }) => void;
    };
  }) => ({
    mutate: (...args: unknown[]) => {
      mocks.startConnectionMutate(...args);
      config?.mutation?.onSuccess?.({
        authUrl: 'https://bundle.social/portal/abc123',
        stage: 'NOT_CONNECTED',
        locations: [],
      });
    },
    isPending: false,
  }),
  useGetReviewProviderLocations: (
    _params?: { businessId?: string },
    options?: { query?: { enabled?: boolean } },
  ) => ({
    data:
      options?.query?.enabled && mocks.callbackStage
        ? { stage: mocks.callbackStage, locations: mocks.callbackLocations }
        : undefined,
    isLoading: false,
  }),
  getGetReviewProviderLocationsQueryKey: () => ['/api/review-management/connection/locations'],
  useSelectReviewProviderLocation: (config?: {
    mutation?: { onSuccess?: () => void; onError?: (error: unknown) => void };
  }) => ({
    mutate: (...args: unknown[]) => {
      mocks.selectLocationMutate(...args);
      config?.mutation?.onSuccess?.();
    },
    isPending: false,
  }),
  useDisconnectReviewProvider: (config?: {
    mutation?: { onSuccess?: () => void };
  }) => ({
    mutate: (...args: unknown[]) => {
      mocks.disconnectMutate(...args);
      config?.mutation?.onSuccess?.();
    },
    isPending: false,
  }),
  useSyncReviewProvider: () => ({ mutate: mocks.syncMutate, isPending: false }),
  useListManagedReviews: () => ({ data: { reviews: [] }, isLoading: false }),
  getListManagedReviewsQueryKey: () => ['/api/review-management/reviews'],
  useGenerateManagedReviewDraft: () => ({
    mutate: mocks.generateMutate,
    isPending: false,
  }),
  usePublishManagedReviewReply: () => ({
    mutate: mocks.publishMutate,
    isPending: false,
  }),
  useDeleteManagedReviewReply: () => ({
    mutate: mocks.deleteMutate,
    isPending: false,
  }),
  ReviewResponseStatus: {
    PENDING: 'PENDING',
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
  },
}));

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: '4f1f9f3e-1111-4222-8333-444455556666',
    locationId: '4f1f9f3e-7777-4888-8999-000011112222',
    locationName: 'Downtown Store',
    reviewerName: 'Alice',
    reviewerPhotoUrl: null,
    isAnonymous: false,
    rating: 4,
    comment: 'Great service!',
    reviewCreatedAt: '2026-08-01T10:00:00Z',
    reviewUpdatedAt: '2026-08-01T10:00:00Z',
    replyText: null,
    replyUpdatedAt: null,
    draftReplyText: null,
    draftGeneratedAt: null,
    requiresApproval: true,
    sensitiveReason: null,
    responseStatus: 'PENDING',
    ...overrides,
  };
}

function renderItem(review: ReturnType<typeof makeReview>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReviewItem review={review as any} />
    </QueryClientProvider>,
  );
}

function renderReviews() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Reviews />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.publishMutate.mockClear();
  mocks.generateMutate.mockClear();
  mocks.deleteMutate.mockClear();
  mocks.startConnectionMutate.mockClear();
  mocks.disconnectMutate.mockClear();
  mocks.syncMutate.mockClear();
  mocks.selectLocationMutate.mockClear();
  mocks.callbackStage = null;
  mocks.callbackLocations = [];
  mocks.providerRemainingImportCapacity = 200;
  mocks.businessImportUsage = { used: 3, reserved: 1, limit: 200, remaining: 196, nearLimit: false };
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('AI draft publish confirmation', () => {
  const draftReview = () =>
    makeReview({
      responseStatus: 'DRAFT',
      draftReplyText: 'Thank you for the kind words, Alice!',
      draftGeneratedAt: '2026-08-02T10:00:00Z',
    });

  it('never publishes a draft without explicit confirmation', async () => {
    const user = userEvent.setup();
    renderItem(draftReview());

    await user.click(screen.getByRole('button', { name: /publish draft/i }));
    expect(
      await screen.findByText('Publish this reply to Google?'),
    ).toBeInTheDocument();
    expect(mocks.publishMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^publish reply$/i }));
    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
  });
});

describe('sensitive-review warnings', () => {
  it('shows the sensitivity warning on flagged reviews', () => {
    renderItem(
      makeReview({
        rating: 1,
        comment: 'Awful experience.',
        sensitiveReason: 'Low-rating review — approval required',
      }),
    );
    expect(
      screen.getByText('Low-rating review — approval required'),
    ).toBeInTheDocument();
  });

  it('disables publishing while the reply body is empty', async () => {
    const user = userEvent.setup();
    renderItem(makeReview());

    await user.click(screen.getByRole('button', { name: /write reply/i }));

    expect(
      screen.getByRole('button', { name: /publish to google/i }),
    ).toBeDisabled();
    expect(mocks.publishMutate).not.toHaveBeenCalled();
  });

  it('lets a manually written reply go through the same confirmation step', async () => {
    const user = userEvent.setup();
    renderItem(makeReview());

    await user.click(screen.getByRole('button', { name: /write reply/i }));
    const textarea = screen.getByPlaceholderText('Write your response here...');
    await user.type(textarea, 'Thanks so much for coming in!');

    await user.click(screen.getByRole('button', { name: /publish to google/i }));
    expect(mocks.publishMutate).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Publish this reply to Google?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^publish reply$/i }));
    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
    expect(mocks.publishMutate).toHaveBeenCalledWith({
      id: makeReview().id,
      data: { comment: 'Thanks so much for coming in!' },
    });
  });

  it('keeps the warning visible while a draft is being confirmed', async () => {
    const user = userEvent.setup();
    renderItem(
      makeReview({
        rating: 5,
        comment: 'I will demand a refund.',
        sensitiveReason: 'Sensitive language detected — approval required',
        responseStatus: 'DRAFT',
        draftReplyText: 'We are sorry to hear that — please contact us.',
        draftGeneratedAt: '2026-08-02T10:00:00Z',
      }),
    );

    expect(
      screen.getByText('Sensitive language detected — approval required'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /publish draft/i }));
    expect(
      await screen.findByText('Publish this reply to Google?'),
    ).toBeInTheDocument();

    // The warning must remain visible while the owner decides.
    expect(
      screen.getByText('Sensitive language detected — approval required'),
    ).toBeInTheDocument();
    expect(mocks.publishMutate).not.toHaveBeenCalled();
  });
});

describe('Reviews dashboard states', () => {
  it('shows "Connection Pending" (not the review inbox) when PENDING with no Google account selected yet', () => {
    mocks.dashboardStatus = 'PENDING';
    renderReviews();

    expect(screen.getByText('Connection Pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review inbox/i })).toHaveAttribute('aria-current', 'page');

    // The full inbox (with its stat cards and review list) must not render
    // while the connection is still pending.
    expect(screen.queryByRole('heading', { name: 'Review Inbox' })).not.toBeInTheDocument();
    expect(screen.queryByText('Needs Reply')).not.toBeInTheDocument();
  });

  it('shows the full Review Inbox with synced summary data once CONNECTED', () => {
    mocks.dashboardStatus = 'CONNECTED';
    renderReviews();

    expect(screen.getByRole('heading', { name: 'Review Inbox' })).toBeInTheDocument();
    expect(screen.getByText('Needs Reply')).toBeInTheDocument();
    expect(screen.getByText('Total Reviews')).toBeInTheDocument();

    // The pending / connect screens must not leak into the connected state.
    expect(screen.queryByText('Connection Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Connect your Google Business')).not.toBeInTheDocument();
  });

  it('shows the assigned usage panel and only warns when the API marks the allowance near its limit', () => {
    mocks.dashboardStatus = 'CONNECTED';
    mocks.businessImportUsage = { used: 196, reserved: 0, limit: 200, remaining: 4, nearLimit: true };
    renderReviews();

    expect(screen.getByTestId('review-usage')).toBeInTheDocument();
    expect(screen.queryByTestId('review-provider-limits')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-usage-warning')).toBeInTheDocument();
    expect(screen.getByText('Only 4 review imports left this month.')).toBeInTheDocument();
  });

  it('warns independently when the shared provider cap reaches 80 percent', () => {
    mocks.providerRemainingImportCapacity = 40;
    renderReviews();

    expect(screen.getByTestId('review-provider-limits')).toBeInTheDocument();
    expect(screen.getByText(/only 40 shared provider review imports remain/i)).toBeInTheDocument();
    expect(screen.queryByTestId('review-usage-warning')).not.toBeInTheDocument();
  });

  it('returns Google cancellation or denial to the requested business without a false success state', async () => {
    mocks.dashboardStatus = 'PENDING';
    mocks.callbackStage = 'NOT_CONNECTED';
    window.history.replaceState(
      {},
      '',
      '/reviews?businessId=business-1&businessName=Test%20Business&bndleConnect=1',
    );

    renderReviews();

    expect(await screen.findByText("Connection wasn't completed")).toBeInTheDocument();
    expect(screen.getByText("It looks like Google sign-in didn't finish. You can try connecting again.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review Inbox' })).not.toBeInTheDocument();
    expect(screen.queryByText('Google Business connected')).not.toBeInTheDocument();

    const params = new URLSearchParams(window.location.search);
    expect(params.get('businessId')).toBe('business-1');
    expect(params.has('bndleConnect')).toBe(false);
  });

  it('closes the location picker before the successful connection settles without racing a fallback sync', async () => {
    const user = userEvent.setup();
    mocks.dashboardStatus = 'PENDING';
    mocks.callbackStage = 'NEEDS_LOCATION';
    mocks.callbackLocations = [
      { id: 'loc-1', name: 'Downtown Store', address: '1 Main Street' },
      { id: 'loc-2', name: 'Uptown Store', address: '2 Main Street' },
    ];
    window.history.replaceState(
      {},
      '',
      '/reviews?businessId=business-1&businessName=Test%20Business&bndleConnect=1',
    );

    renderReviews();

    expect(await screen.findByText('Choose your business')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /uptown store/i }));
    await user.click(screen.getByRole('button', { name: /connect this location/i }));

    expect(mocks.selectLocationMutate).toHaveBeenCalledWith({
      data: { businessId: 'business-1', locationId: 'loc-2' },
    });
    expect(screen.queryByText('Choose your business')).not.toBeInTheDocument();
    expect(screen.queryByText('Connecting your business…')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection wasn’t completed')).not.toBeInTheDocument();
    expect(mocks.syncMutate).not.toHaveBeenCalled();
  });

  it('requires confirmation before disconnecting a connected Google Business store', async () => {
    const user = userEvent.setup();
    mocks.dashboardStatus = 'CONNECTED';
    renderReviews();

    await user.click(screen.getByRole('button', { name: /^disconnect$/i }));
    expect(
      screen.getByText('Disconnect this Google Business store?'),
    ).toBeInTheDocument();
    expect(mocks.disconnectMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^disconnect store$/i }));
    expect(mocks.disconnectMutate).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cached dashboard on a successful connect, so the PENDING auto-sync-on-focus activates without a manual reload', () => {
    // Regression test: starting a connection used to leave the cached
    // dashboard on DISCONNECTED, so the PENDING-only focus/visibility
    // listener never mounted and the tab silently never auto-synced when
    // the user came back from Google.
    mocks.dashboardStatus = 'DISCONNECTED';
    window.history.replaceState({}, '', '/reviews?businessId=business-1');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.spyOn(window, 'open').mockReturnValue({ opener: null } as unknown as Window);

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Reviews />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Connect your Google Business')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /connect google business/i }));

    expect(mocks.startConnectionMutate).toHaveBeenCalledTimes(1);
    expect(mocks.startConnectionMutate).toHaveBeenCalledWith({ data: { businessId: 'business-1' } });
    // The fix under test: a successful start must invalidate the dashboard
    // query, not just open the portal tab.
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['/api/review-management'] }),
    );

    // Simulate the refetch that invalidation triggers in the real app: the
    // dashboard now reports PENDING, so the page re-renders into the
    // Connection Pending screen and mounts its focus-triggered auto-sync.
    mocks.dashboardStatus = 'PENDING';
    rerender(
      <QueryClientProvider client={queryClient}>
        <Reviews />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Connection Pending')).toBeInTheDocument();
    expect(mocks.syncMutate).not.toHaveBeenCalled();

    // The user returns to this tab after finishing Google sign-in elsewhere.
    window.dispatchEvent(new Event('focus'));
    expect(mocks.syncMutate).toHaveBeenCalledTimes(1);
    window.history.replaceState({}, '', '/reviews');
  });
});
