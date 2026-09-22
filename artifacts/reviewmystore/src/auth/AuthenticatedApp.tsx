import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCurrentUserQueryKey,
  getGetPublicAgencyInvitationQueryKey,
  useGetCurrentUser,
  useGetPublicAgencyInvitation,
} from "@workspace/api-client-react";
import {
  BRAND_LOGO_LIGHT,
  BrandIcon,
} from "@/components/brand-logo";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { Button } from "@/components/ui/button";
import {
  clearInvitationToken,
  resolveInvitationToken,
} from "./invitation-token";
import {
  basePath,
  safeReturnPath,
  signInRedirectFor,
  stripBase,
  withBasePath,
} from "./redirect";
import { SessionExpiryWatcher } from "./SessionExpiryWatcher";

const AgencyJoin = lazy(() => import("@/pages/AgencyJoin"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Businesses = lazy(() => import("@/pages/Businesses"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const QrCodes = lazy(() => import("@/pages/QrCodes"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const SocialMedia = lazy(() => import("@/pages/SocialMedia"));
const BusinessAnalytics = lazy(() => import("@/pages/BusinessAnalytics"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const AdminLeads = lazy(() => import("@/pages/AdminLeads"));
const AdminPortal = lazy(() => import("@/pages/AdminPortal"));
const NotFound = lazy(() => import("@/pages/not-found"));

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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
      "!h-11 !w-full !rounded-lg !bg-white !border-slate-300 !pr-[3.25rem] !text-slate-950 placeholder:!text-slate-500 focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-100 transition-all",
    formFieldInputShowPasswordButton:
      "!w-10 !min-w-10 !max-w-10 !p-2 !text-blue-600 hover:!text-blue-800",
    footerAction: "mt-5",
    dividerLine: "!bg-slate-200",
    alert: "!border-amber-200 !bg-amber-50",
    otpCodeFieldInput:
      "!h-14 !w-12 !rounded-lg !border-slate-300 !bg-white !p-0 !text-center !text-xl !font-semibold !text-slate-950 !shadow-sm focus:!border-blue-700 focus:!ring-2 focus:!ring-blue-100",
    formFieldRow: "mb-4",
    main: "w-full",
  },
};

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-950">
      <main className="mx-auto flex min-h-[100dvh] w-full flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[560px]">
          <div className="border-b border-slate-200 pb-6">
            <img
              src={BRAND_LOGO_LIGHT}
              alt="5-Star.AI"
              className="mx-auto block h-14 w-auto max-w-[18rem] object-contain"
            />
          </div>
          <div className="border-b border-slate-200 py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

function SignInPage() {
  const returnTo = safeReturnPath(
    new URLSearchParams(window.location.search).get("redirect_url"),
  );
  const { isLoaded, isSignedIn } = useAuth();

  if (stripBase(window.location.pathname) === "/sign-in/create") {
    return <Redirect to="/sign-in" />;
  }

  if (isLoaded && isSignedIn) {
    return <Redirect to={returnTo} />;
  }

  return (
    <AuthLayout>
      <div className="auth-form-section w-full">
        <div className="border-b border-slate-200 pb-6 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Agency workspace
          </p>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-100 p-1 pl-3 text-xs font-medium text-amber-900">
            <span>Agency access only</span>
            <BookDemoDialog>
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-full bg-amber-900 px-3 text-xs font-semibold text-white shadow-none hover:bg-amber-800"
              >
                Contact form
              </Button>
            </BookDemoDialog>
          </div>
        </div>
        <div className="pt-6">
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            appearance={{
              elements: {
                footerAction: "!hidden",
              },
            }}
             fallbackRedirectUrl={withBasePath(returnTo)}
          />
        </div>
      </div>
    </AuthLayout>
  );
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [inviteToken] = useState(() =>
    resolveInvitationToken(window.location.search, window.sessionStorage),
  );
  const returnTo = safeReturnPath(
    new URLSearchParams(window.location.search).get("redirect_url"),
  );
  const { data: invitation, isLoading } = useGetPublicAgencyInvitation(
    inviteToken,
    {
      query: {
        enabled: isLoaded && !isSignedIn && !!inviteToken,
        queryKey: getGetPublicAgencyInvitationQueryKey(inviteToken),
      },
    },
  );

  if (!isLoaded || isLoading) {
    return <AuthPageLoader />;
  }

  if (isSignedIn) {
    return <Redirect to="/post-sign-in" />;
  }

  if (!invitation) {
    return <Redirect to="/sign-in" />;
  }

  return (
    <AuthLayout>
      <div className="auth-form-section w-full">
        <div className="border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Agency invitation
          </p>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-slate-950">
            Create your owner account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Invitation for {invitation.organizationName}
          </p>
        </div>
        <div className="pt-6">
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            initialValues={{ emailAddress: invitation.email }}
             fallbackRedirectUrl={withBasePath(returnTo)}
          />
        </div>
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

function RoleAwareRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const {
    data: session,
    isLoading,
    isError,
  } = useGetCurrentUser({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  useEffect(() => {
    if (isSignedIn) {
      clearInvitationToken(window.sessionStorage);
    }
  }, [isSignedIn]);

  if (!isLoaded || (isSignedIn && isLoading)) {
    return <AuthPageLoader />;
  }
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }
  if (isError || !session) {
    return (
      <AuthLayout>
        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold text-slate-950">
            We couldn&apos;t open your account
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Refresh the page. If the problem continues, sign out and sign in
            again.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <Redirect
      to={
        session.user.role === "SUPER_ADMIN"
          ? "/admin/portal"
          : "/businesses"
      }
    />
  );
}

function AuthPageLoader() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-background"
      role="status"
      aria-label="Loading page"
    >
      <BrandIcon className="h-10 w-10 animate-pulse" />
    </div>
  );
}

function AuthenticatedRoutes() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();
  const path = location.split("?")[0];
  const publicAuthRoute =
    path === "/sign-in" ||
    path.startsWith("/sign-in/") ||
    path === "/sign-up" ||
    path.startsWith("/sign-up/") ||
    path.startsWith("/agency/join/");

  if (!isLoaded) return <AuthPageLoader />;
  if (!isSignedIn && !publicAuthRoute) {
    return <Redirect to={signInRedirectFor(location)} />;
  }

  return (
    <Suspense fallback={<AuthPageLoader />}>
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/agency/join/:token" component={AgencyJoin} />
        <Route path="/post-sign-in" component={RoleAwareRedirect} />
        <Route path="/dashboard" component={RoleAwareRedirect} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/businesses" component={Businesses} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/qr-codes" component={QrCodes} />
        <Route path="/reviews" component={Reviews} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/social-media" component={SocialMedia} />
        <Route path="/business-analytics" component={BusinessAnalytics} />
        <Route path="/insights" component={Analytics} />
        <Route path="/insigts" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/admin/portal" component={AdminPortal} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function AuthenticatedApp() {
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
      <ClerkQueryClientCacheInvalidator />
      <SessionExpiryWatcher />
      <AuthenticatedRoutes />
    </ClerkProvider>
  );
}