import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import {
  BRAND_LOGO_DARK,
  BRAND_LOGO_LIGHT,
  BrandIcon,
  BrandLogo,
} from "@/components/brand-logo";
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
          (error as { status?: unknown; response?: { status?: unknown } })
            .status ??
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
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
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
      "!w-full !max-w-none !bg-transparent !border-0 !shadow-none !rounded-none !p-0 !text-slate-950",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none !p-0",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none !p-0",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    socialButtonsBlockButtonText: "!text-slate-900 font-medium",
    formFieldLabel: "!text-slate-800 font-medium",
    footerActionLink:
      "!text-sm !text-slate-500 hover:!text-slate-800 hover:!underline font-medium",
    footerActionText: "!text-sm !text-slate-500",
    dividerText: "!text-slate-500",
    identityPreviewEditButton:
      "!text-sm !text-slate-600 hover:!text-slate-900 hover:!underline",
    formFieldSuccessText: "!text-emerald-600",
    alertText: "!text-amber-950",
    logoBox: "!hidden",
    logoImage: "!hidden",
    socialButtonsBlockButton:
      "!h-11 !rounded-lg !border-slate-300 !bg-white !text-slate-900 hover:!bg-slate-50 transition-colors",
    formButtonPrimary:
      "!h-11 !w-full !rounded-lg !bg-slate-950 !text-white hover:!bg-slate-800 transition-all shadow-sm",
    formFieldInput:
      "!h-11 !rounded-lg !bg-white !border-slate-300 !text-slate-950 placeholder:!text-slate-500 focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-100 transition-all",
    footerAction: "mt-5",
    dividerLine: "!bg-slate-200",
    alert: "!border-amber-200 !bg-amber-50",
    otpCodeFieldInput:
      "!h-14 !w-12 !rounded-lg !border-slate-300 !bg-white !p-0 !text-center !text-xl !font-semibold !text-slate-950 !shadow-sm focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-100",
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
      <aside className="relative hidden overflow-hidden bg-[#235de2] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="auth-hero-mesh pointer-events-none absolute inset-0" />
        <div className="auth-hero-dots pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex items-center gap-3">
          <img
            src={BRAND_LOGO_LIGHT}
            alt="5-Star.AI"
            className="h-16 w-auto max-w-[18rem] object-contain"
          />
        </div>
        <div className="relative z-10 max-w-lg pb-4">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Reputation, made practical
          </p>
          <h1 className="font-sans text-5xl font-semibold leading-[1.02] tracking-tight text-white">
            Make the good
            <br />
            moments visible.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/75">
            A calmer way to turn real customer experiences into reviews your
            next guest can trust.
          </p>
          <div className="mt-8 max-w-sm rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl shadow-blue-950/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-slate-700"
                aria-hidden="true"
              >
                AM
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Aarav Mehta
                </p>
                <p className="text-xs text-white/60">Verified customer</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                Google
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className="text-lg leading-none text-amber-300">
                  ★
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              “The team made our stay feel effortless. I’ll happily recommend
              them to anyone visiting the city.”
            </p>
          </div>
        </div>
        <p className="relative z-10 text-xs uppercase tracking-[0.18em] text-white/60">
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
      <div className="w-full max-w-[480px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Agency workspace
          </p>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-slate-950">
            Sign in to 5-Star.AI
          </h1>
        </div>
        <p className="mb-6 inline-flex max-w-full rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium leading-relaxed text-amber-800">
          Agency access only — contact the Admin at hello@5-star.ai
        </p>
        <SignIn routing="path" path={`${basePath}/sign-in`} />
      </div>
    </AuthLayout>
  );
}

function SignUpPage() {
  const inviteToken =
    new URLSearchParams(window.location.search).get("invite") ?? "";
  const { data: invitation, isLoading } = useGetPublicAgencyInvitation(
    inviteToken,
    {
      query: {
        enabled: !!inviteToken,
        queryKey: getGetPublicAgencyInvitationQueryKey(inviteToken),
      },
    },
  );

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
            New accounts are created from a secure invitation link. Ask the
            platform administrator for access.
          </p>
          <a
            href={`${basePath}/sign-in`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800"
          >
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
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-background"
      role="status"
      aria-label="Loading page"
    >
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
        <Route
          path="/review/:businessSlug/:campaignSlug"
          component={CustomerReview}
        />
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
