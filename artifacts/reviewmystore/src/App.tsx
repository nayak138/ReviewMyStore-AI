import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useEffect, useRef, useState, useMemo, lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BrandIcon, BrandLogo } from "@/components/brand-logo";
import {
  getGetPublicAgencyInvitationQueryKey,
  useGetPublicAgencyInvitation,
} from "@workspace/api-client-react";

// Route-level code splitting: each page loads its own chunk so first-time
// visitors to the marketing page don't download the authenticated app.
const About = lazy(() => import("./pages/marketing/About"));
const Blog = lazy(() => import("./pages/marketing/Blog"));
const BlogPost = lazy(() => import("./pages/marketing/BlogPost"));
const Resources = lazy(() => import("./pages/marketing/Resources"));
const Privacy = lazy(() => import("./pages/marketing/Privacy"));
const Terms = lazy(() => import("./pages/marketing/Terms"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Businesses = lazy(() => import("./pages/Businesses"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CustomerReview = lazy(() => import("./pages/CustomerReview"));
const ShortRedirect = lazy(() => import("./pages/ShortRedirect"));
const QrCodes = lazy(() => import("./pages/QrCodes"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Feedback = lazy(() => import("./pages/Feedback"));
const SocialMedia = lazy(() => import("./pages/SocialMedia"));
const BusinessAnalytics = lazy(() => import("./pages/BusinessAnalytics"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));

const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const AgencyJoin = lazy(() => import("./pages/AgencyJoin"));
const NotFound = lazy(() => import("./pages/not-found"));

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null
      ? Number(
          (error as { status?: unknown; response?: { status?: unknown } }).status ??
            (error as { response?: { status?: unknown } }).response?.status,
        )
      : undefined;
  return status !== 401 && status !== 403 && failureCount < 2;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
  variables: {
    colorPrimary: "hsl(221, 83%, 40%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 38%)",
    colorDanger: "hsl(0, 72%, 42%)",
    colorSuccess: "hsl(142, 72%, 29%)",
    colorWarning: "hsl(32, 95%, 30%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 25%, 82%)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center !text-slate-950",
    cardBox:
      "!bg-white rounded-[1.25rem] w-[440px] max-w-full overflow-hidden !border-slate-200 !text-slate-950 shadow-[0_20px_70px_-28px_rgba(15,23,42,0.24)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    socialButtonsBlockButtonText: "!text-slate-900 font-medium",
    formFieldLabel: "!text-slate-800 font-medium",
    footerActionLink: "!text-blue-700 hover:!text-blue-900 font-medium",
    footerActionText: "!text-slate-600",
    dividerText: "!text-slate-500",
    identityPreviewEditButton: "!text-blue-700 hover:!text-blue-900",
    formFieldSuccessText: "!text-emerald-600",
    alertText: "!text-amber-950",
    logoBox: "mb-2",
    logoImage: "!h-16 !w-auto !max-w-[20rem]",
    socialButtonsBlockButton:
      "!border-slate-300 !bg-white !text-slate-900 hover:!bg-slate-50 transition-colors",
    formButtonPrimary:
      "!bg-slate-950 !text-white hover:!bg-slate-800 transition-colors shadow-sm",
    formFieldInput:
      "!bg-white !border-slate-300 !text-slate-950 placeholder:!text-slate-500 focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-700 transition-all",
    footerAction: "mt-4",
    dividerLine: "!bg-slate-200",
    alert: "!border-amber-200 !bg-amber-50",
    otpCodeFieldInput:
      "!border-slate-300 !bg-white !text-slate-950 !shadow-sm focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-700",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

/** Branded two-panel shell for the auth pages: a storefront-blue brand panel
 * with the full logo lockup + tagline (desktop only), and the Clerk form on
 * the other side. Collapses to a single stacked column on mobile. */
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 lg:grid lg:grid-cols-[minmax(360px,0.92fr)_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-primary px-12 py-14 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-primary-foreground/10" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[48px] border-primary-foreground/10" />
        <div className="relative z-10 flex items-center gap-3">
          <img src={BRAND_LOGO_LIGHT} alt="5-Star.AI" className="h-20 w-auto max-w-[20rem] object-contain" />
        </div>
        <div className="relative z-10 max-w-md pb-8">
          <div className="mb-8 flex gap-2" aria-label="Google rating">
            {["#4285F4", "#EA4335", "#FBBC05", "#34A853", "#4285F4"].map((color, index) => (
              <span key={`${color}-${index}`} className="h-2.5 w-10 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-primary-foreground">
            Make the good
            <br />
            moments visible.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-primary-foreground/75">
            A calmer way to turn real customer experiences into reviews your next guest can trust.
          </p>
        </div>
        <p className="relative z-10 text-xs uppercase tracking-[0.18em] text-primary-foreground/50">
          Built for thoughtful local businesses
        </p>
      </aside>
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 py-10 text-slate-950 sm:px-8">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <BrandLogo className="h-12 w-auto max-w-[16rem]" />
        </div>
        {children}
      </main>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-[440px]">
        <h1 className="mb-4 text-center font-display text-2xl font-semibold tracking-tight text-slate-950">
          Sign in to 5-Star.AI
        </h1>
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold leading-relaxed text-amber-950">
          Agency Login only — contact the Admin at hello@5-star.ai
        </p>
        <SignIn routing="path" path={`${basePath}/sign-in`} />
      </div>
    </AuthLayout>
  );
}

function SignUpPage() {
  const inviteToken = new URLSearchParams(window.location.search).get("invite") ?? "";
  const { data: invitation, isLoading } = useGetPublicAgencyInvitation(inviteToken, {
    query: {
      enabled: !!inviteToken,
      queryKey: getGetPublicAgencyInvitationQueryKey(inviteToken),
    },
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!invitation) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[440px] rounded-[1.25rem] border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-red-800 dark:text-red-200">
            Agency access only
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-red-700 dark:text-red-300">
            New accounts are created from a secure invitation link. Ask the platform administrator for access.
          </p>
          <a href={`${basePath}/sign-in`} className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800">
            Agency login
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[440px] rounded-[1.25rem] border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Create your owner account
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Invitation for {invitation.organizationName}
        </p>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          initialValues={{ emailAddress: invitation.email }}
           fallbackRedirectUrl={`${basePath}/businesses`}
        />
      </div>
    </AuthLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/businesses" />
      </Show>
      <Show when="signed-out">
        <Marketing />
      </Show>
    </>
  );
}

/** Suspense fallback for lazy-loaded routes. Renders nothing for the first
 * ~150ms so fast connections never see a flash; after that, shows a subtle
 * centered branded spinner while the page chunk downloads. */
function PageLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-4">
        <BrandIcon className="w-10 h-10 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[page-loader-slide_1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/agency/join/:token" component={AgencyJoin} />

      {/* Public marketing pages */}
      <Route path="/about" component={About} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/resources" component={Resources} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Public customer-facing review page */}
      <Route path="/review/:businessSlug/:campaignSlug" component={CustomerReview} />
      {/* Public QR short-link redirect */}
      <Route path="/r/:code" component={ShortRedirect} />

      {/* Protected Routes */}
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/businesses" component={Businesses} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/qr-codes" component={QrCodes} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/social-media" component={SocialMedia} />
      <Route path="/business-analytics" component={BusinessAnalytics} />
      <Route path="/insigts" component={Analytics} />
      <Route path="/settings" component={Settings} />
      {/* Super Admin only */}
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/admin/portal" component={AdminPortal} />
      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { resolvedTheme } = useTheme();
  const themeAwareClerkAppearance = useMemo(
    () => ({
      ...clerkAppearance,
      options: {
        ...clerkAppearance.options,
        logoImageUrl: `${window.location.origin}${resolvedTheme === "dark" ? BRAND_LOGO_DARK : BRAND_LOGO_LIGHT}`,
      },
    }),
    [resolvedTheme],
  );

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={themeAwareClerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "Sign in to 5-Star.AI",
            subtitle: "Agency access only",
          },
        },
        signUp: {
          start: {
            title: "Agency access only",
            subtitle: "Contact the Admin to request access",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppRouter />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WouterRouter base={basePath}>
        <TooltipProvider>
          <ClerkProviderWithRoutes />
          <Toaster />
        </TooltipProvider>
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
