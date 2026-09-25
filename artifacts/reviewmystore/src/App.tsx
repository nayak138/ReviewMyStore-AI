import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import {
  useEffect,
  useState,
  lazy,
  Suspense,
  type ComponentType,
} from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandIcon } from "@/components/brand-logo";
import About from "./pages/marketing/About";
import Blog from "./pages/marketing/Blog";
import BlogPost from "./pages/marketing/BlogPost";
import Resources from "./pages/marketing/Resources";
import Privacy from "./pages/marketing/Privacy";
import Terms from "./pages/marketing/Terms";
import Marketing from "./pages/Marketing";

// Route-level code splitting: public visitors do not download the protected
// dashboard or Clerk until they navigate to an authenticated route.
const AuthenticatedApp = lazy(() => import("./auth/AuthenticatedApp"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function lazyWithAppProviders(
  loadPage: () => Promise<{ default: ComponentType }>,
) {
  return lazy(async () => {
    const [{ default: Page }, { AppProviders }] = await Promise.all([
      loadPage(),
      import("@/components/app-providers"),
    ]);
    return {
      default: function AppProvidedRoute() {
        return (
          <AppProviders>
            <Page />
          </AppProviders>
        );
      },
    };
  });
}

const CustomerReview = lazyWithAppProviders(() => import("./pages/CustomerReview"));
const ShortRedirect = lazyWithAppProviders(() => import("./pages/ShortRedirect"));

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
        <BrandIcon className="h-10 w-10 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[page-loader-slide_1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function PublicAppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Marketing} />
        <Route path="/about" component={About} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/resources" component={Resources} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route
          path="/review/:businessSlug/:campaignSlug"
          component={CustomerReview}
        />
        <Route path="/r/:code" component={ShortRedirect} />
      </Switch>
    </Suspense>
  );
}

function isPublicRoute(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return (
    path === "/" ||
    path === "/about" ||
    path === "/blog" ||
    path.startsWith("/blog/") ||
    path === "/resources" ||
    path === "/privacy" ||
    path === "/terms" ||
    path.startsWith("/review/") ||
    path.startsWith("/r/")
  );
}

function AppShell() {
  const [location] = useLocation();

  return isPublicRoute(location) ? (
    <PublicAppRouter />
  ) : (
    <Suspense fallback={<PageLoader />}>
      <AuthenticatedApp />
    </Suspense>
  );
}

function App({ ssrPath }: { ssrPath?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WouterRouter base={basePath} ssrPath={ssrPath}>
        <AppShell />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;