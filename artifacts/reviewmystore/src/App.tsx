import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandIcon } from "@/components/brand-logo";

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
const Reviews = lazy(() => import("./pages/Reviews"));

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
    colorPrimary: "hsl(221, 68%, 39%)",
    colorForeground: "hsl(224, 34%, 17%)",
    colorMutedForeground: "hsl(220, 13%, 43%)",
    colorDanger: "hsl(5, 72%, 48%)",
    colorSuccess: "hsl(145, 42%, 34%)",
    colorWarning: "hsl(39, 92%, 47%)",
    colorBackground: "hsl(42, 42%, 97%)",
    colorInput: "hsl(45, 50%, 99%)",
    colorInputForeground: "hsl(224, 34%, 17%)",
    colorNeutral: "hsl(40, 24%, 87%)",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-[1.25rem] w-[440px] max-w-full overflow-hidden border border-border shadow-[0_20px_70px_-28px_hsl(224_34%_17%_/_0.38)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "!text-foreground font-semibold",
    headerSubtitle: "!text-muted-foreground",
    socialButtonsBlockButtonText: "!text-foreground font-medium",
    formFieldLabel: "!text-foreground font-medium",
    footerActionLink: "!text-primary hover:!text-primary/90 font-medium",
    footerActionText: "!text-muted-foreground",
    dividerText: "!text-muted-foreground",
    identityPreviewEditButton: "!text-primary hover:!text-primary/90",
    formFieldSuccessText: "!text-emerald-600",
    alertText: "!text-foreground",
    logoBox: "mb-2",
    logoImage: "w-8 h-8",
    socialButtonsBlockButton: "border-border hover:bg-accent transition-colors",
    formButtonPrimary: "bg-primary !text-white hover:bg-primary/90 transition-colors shadow-sm",
    formFieldInput: "bg-card border-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
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
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(360px,0.92fr)_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-primary px-12 py-14 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-primary-foreground/10" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[48px] border-primary-foreground/10" />
        <div className="relative z-10 flex items-center gap-3">
          <BrandIcon className="h-10 w-10 rounded-xl bg-primary-foreground/10 p-1" />
          <span className="font-display text-xl font-semibold tracking-tight">ReviewMyStore.AI</span>
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
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <BrandIcon className="h-9 w-9 rounded-lg" />
          <span className="font-display text-lg font-semibold tracking-tight">ReviewMyStore.AI</span>
        </div>
        {children}
      </main>
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
       <Route path="/reviews" component={Reviews} />
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
