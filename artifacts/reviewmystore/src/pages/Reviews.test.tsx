import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * UI safety tests for the review inbox:
 *  - an AI draft can never be published without the explicit confirmation
 *    dialog being accepted first
 *  - manually edited replies go through the same confirmation step
 *  - sensitive-review warnings stay visible while drafting and confirming
 */

const mocks = vi.hoisted(() => ({
  publishMutate: vi.fn(),
  generateMutate: vi.fn(),
  deleteMutate: vi.fn(),
}));

vi.mock('@workspace/api-client-react', () => ({
  useGetReviewDashboard: () => ({ data: undefined, isLoading: false }),
  getGetReviewDashboardQueryKey: () => ['/api/review-management'],
  useStartReviewProviderConnection: () => ({ mutate: vi.fn(), isPending: false }),
  useSyncReviewProvider: () => ({ mutate: vi.fn(), isPending: false }),
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

import { ReviewItem } from './Reviews';

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

beforeEach(() => {
  mocks.publishMutate.mockClear();
  mocks.generateMutate.mockClear();
  mocks.deleteMutate.mockClear();
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

    expect(screen.getByText('AI Generated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /publish draft/i }));

    // Clicking "Publish Draft" must only open the confirmation dialog.
    expect(mocks.publishMutate).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Publish this reply to Google?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^publish reply$/i }));

    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
    expect(mocks.publishMutate).toHaveBeenCalledWith({
      id: draftReview().id,
      data: { comment: 'Thank you for the kind words, Alice!' },
    });
  });

  it('cancelling the confirmation keeps the reply unpublished', async () => {
    const user = userEvent.setup();
    renderItem(draftReview());

    await user.click(screen.getByRole('button', { name: /publish draft/i }));
    expect(
      await screen.findByText('Publish this reply to Google?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keep editing/i }));

    await waitFor(() => {
      expect(
        screen.queryByText('Publish this reply to Google?'),
      ).not.toBeInTheDocument();
    });
    expect(mocks.publishMutate).not.toHaveBeenCalled();
  });

  it('requires confirmation for manually edited replies too', async () => {
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

  it('disables publishing while the reply body is empty', async () => {
    const user = userEvent.setup();
    renderItem(makeReview());

    await user.click(screen.getByRole('button', { name: /write reply/i }));

    expect(
      screen.getByRole('button', { name: /publish to google/i }),
    ).toBeDisabled();
    expect(mocks.publishMutate).not.toHaveBeenCalled();
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
