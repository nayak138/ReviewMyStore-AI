import type { ReactNode } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  isSessionExpiredError,
  signalSessionExpired,
} from "@/auth/session-expiry";

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null
      ? Number(
          (error as { status?: unknown; response?: { status?: unknown } })
            .status ??
            (error as { response?: { status?: unknown } }).response?.status,
        )
      : undefined;
  return status !== 401 && status !== 403 && failureCount < 2;
}

// Keep one cache across authenticated routes and public API pages. The module
// is only requested by routes or interactions that actually use API hooks.
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isSessionExpiredError(error)) signalSessionExpired("api");
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isSessionExpiredError(error)) signalSessionExpired("api");
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <Toaster />
    </TooltipProvider>
  );
}