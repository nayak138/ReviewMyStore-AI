import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandIcon, BrandLogo } from "@/components/brand-logo";

// Route-level code splitting: each page loads its own chunk so first-time
// visitors to the marketing page don't download the authenticated app.
import About from "./pages/marketing/About";
import Blog from "./pages/marketing/Blog";
import BlogPost from "./pages/marketing/BlogPost";
import Resources from "./pages/marketing/Resources";
import Privacy from "./pages/marketing/Privacy";
import Terms from "./pages/marketing/Terms";
const Marketing = lazy(() => import("./pages/Marketing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Businesses = lazy(() => import("./pages/Businesses"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CustomerReview = lazy(() => import("./pages/CustomerReview"));
const ShortRedirect = lazy(() => import("./pages/ShortRedirect"));
const QrCodes = lazy(() => import("./pages/QrCodes"));
const NfcDevices = lazy(() => import("./pages/NfcDevices"));

const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const NotFound = lazy(() => import("./pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
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
    logoImageUrl: `${window.location.origin}${basePath}/brand/logo-icon.png`,
  },
  variables: {
    colorPrimary: "hsl(217, 89%, 61%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(5, 81%, 56%)",
    colorSuccess: "hsl(136, 53%, 43%)",
    colorWarning: "hsl(45, 97%, 50%)",
    colorBackground: "hsl(210, 20%, 98%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white dark:bg-zinc-950 rounded-2xl w-[440px] max-w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "!text-zinc-950 dark:!text-zinc-50 font-semibold",
    headerSubtitle: "!text-zinc-500 dark:!text-zinc-400",
    socialButtonsBlockButtonText: "!text-zinc-950 dark:!text-zinc-50 font-medium",
    formFieldLabel: "!text-zinc-950 dark:!text-zinc-50 font-medium",
    footerActionLink: "!text-primary hover:!text-primary/90 font-medium",
    footerActionText: "!text-zinc-500 dark:!text-zinc-400",
    dividerText: "!text-zinc-500 dark:!text-zinc-400",
    identityPreviewEditButton: "!text-primary hover:!text-primary/90",
    formFieldSuccessText: "!text-emerald-600",
    alertText: "!text-zinc-950 dark:!text-zinc-50",
    logoBox: "mb-2",
    logoImage: "w-8 h-8",
    socialButtonsBlockButton: "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
    formButtonPrimary: "bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm",
    formFieldInput: "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
    footerAction: "mt-4",
    dividerLine: "bg-zinc-200 dark:bg-zinc-800",
    alert: "border-zinc-200 dark:border-zinc-800",
    otpCodeFieldInput: "border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

/** Branded two-panel shell for the auth pages: a storefront-blue brand panel
 * with the full logo lockup + tagline (desktop only), and the Clerk form on
 * the other side. Collapses to a single stacked column on mobile. */
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950">
        <div
          className="absolute inset-0 opacity-[0.15] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #4285F4 0, transparent 30%), radial-gradient(circle at 85% 15%, #EA4335 0, transparent 25%), radial-gradient(circle at 20% 85%, #FBBC05 0, transparent 28%), radial-gradient(circle at 85% 80%, #34A853 0, transparent 30%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md">
          <BrandIcon className="w-24 h-24 drop-shadow-sm" />
          <BrandLogo className="w-full max-w-xs mt-8" />
          <p className="mt-6 text-muted-foreground text-base leading-relaxed">
            Turn happy customers into 5-star Google reviews — in seconds, not minutes.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="lg:hidden w-full max-w-[280px] mb-8 flex justify-center">
          <BrandLogo className="w-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthLayout>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthLayout>
  );
}

function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
        <Redirect to="/dashboard" />
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

      {/* Public marketing pages */}
      <Route path="/about" component={About} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/resources" component={Resources} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Public customer-facing review page */}
      <Route path="/review/:businessSlug/:campaignSlug" component={CustomerReview} />
      {/* Public QR/NFC short-link redirect */}
      <Route path="/r/:code" component={ShortRedirect} />

      {/* Protected Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/businesses" component={Businesses} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/qr-codes" component={QrCodes} />
      <Route path="/nfc-devices" component={NfcDevices} />
      {/* Super Admin only */}
      <Route path="/admin/leads" component={AdminLeads} />
      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Sign in to ReviewMyStore",
            subtitle: "Manage your reputation",
          },
        },
        signUp: {
          start: {
            title: "Start collecting reviews",
            subtitle: "Set up your workspace",
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
