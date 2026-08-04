import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

// Import pages
import Marketing from "./pages/Marketing";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Businesses from "./pages/Businesses";
import Campaigns from "./pages/Campaigns";
import CustomerReview from "./pages/CustomerReview";
import ShortRedirect from "./pages/ShortRedirect";
import QrCodes from "./pages/QrCodes";
import NfcDevices from "./pages/NfcDevices";
import NotFound from "./pages/not-found";

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
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
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

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

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
      
      <Route component={NotFound} />
    </Switch>
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
