import { useState } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { Redirect, Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Store, 
  Megaphone, 
  QrCode, 
  SmartphoneNfc, 
  BarChart3, 
  ShoppingCart,
  LogOut,
  Settings,
  ShieldAlert,
  Menu,
  X
} from "lucide-react";
import { 
  useGetCurrentUser, 
  getGetCurrentUserQueryKey,
  useGetAdminOverview,
  getGetAdminOverviewQueryKey
} from "@workspace/api-client-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { name: "Businesses", icon: Store, href: "/businesses", active: false },
  { name: "Campaigns", icon: Megaphone, href: "/campaigns", active: false },
  { name: "QR Codes", icon: QrCode, href: "/qr-codes", active: false },
  { name: "NFC Devices", icon: SmartphoneNfc, href: "/nfc-devices", active: false },
  { name: "Analytics", icon: BarChart3, href: "/analytics", active: false },
  { name: "Orders", icon: ShoppingCart, href: "/orders", active: false },
];

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: sessionInfo, isLoading: isSessionLoading } = useGetCurrentUser({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetCurrentUserQueryKey(),
    }
  });

  const isSuperAdmin = sessionInfo?.user?.role === "SUPER_ADMIN";

  const { data: adminOverview, isLoading: isAdminLoading } = useGetAdminOverview({
    query: {
      enabled: isSuperAdmin,
      queryKey: getGetAdminOverviewQueryKey(),
    }
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className="min-h-[100dvh] flex bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:transform-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-6 h-6" />
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">ReviewMyStore</span>
          </div>
          <button className="md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.name} href={item.active ? item.href : "#"}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group",
                  item.active
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                  !item.active && "opacity-75 cursor-not-allowed"
                )}
                onClick={(e) => {
                  if (!item.active) e.preventDefault();
                  else setMobileMenuOpen(false);
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
                {!item.active && (
                  <span className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                    Coming soon
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Welcome Section */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {isSessionLoading ? <Skeleton className="h-9 w-64" /> : `Welcome back, ${sessionInfo?.user?.name.split(' ')[0]}`}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                  Here is what's happening with your account today.
                </p>
              </div>
            </div>

            {/* Profile & Org Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* User Profile Card */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Your Profile
                    {isSessionLoading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <Badge variant={isSuperAdmin ? "destructive" : "secondary"}>
                        {sessionInfo?.user?.role}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Personal details and preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSessionLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Name</div>
                        <div className="text-base text-zinc-900 dark:text-zinc-50">{sessionInfo?.user?.name}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Email</div>
                        <div className="text-base text-zinc-900 dark:text-zinc-50">{sessionInfo?.user?.email}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Member Since</div>
                        <div className="text-base text-zinc-900 dark:text-zinc-50">
                          {new Date(sessionInfo?.user?.createdAt || "").toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Organization Card */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Workspace
                    {!isSessionLoading && sessionInfo?.organization && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        {sessionInfo.organization.plan} PLAN
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isSuperAdmin ? "Platform administrative context" : "Your primary business organization"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSessionLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : sessionInfo?.organization ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Organization Name</div>
                        <div className="text-base text-zinc-900 dark:text-zinc-50 font-medium">
                          {sessionInfo.organization.name}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</div>
                          <div className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {sessionInfo.organization.status}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Subscription</div>
                          <div className="text-base text-zinc-900 dark:text-zinc-50 capitalize">
                            {sessionInfo.organization.subscriptionStatus.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isSuperAdmin ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                      <ShieldAlert className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-3" />
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                        Super Admins operate globally and are not bound to a single organization.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                        Setting up your workspace...
                      </p>
                      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Admin Overview (Only for SUPER_ADMIN) */}
            {isSuperAdmin && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Platform Overview</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {isAdminLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="shadow-sm">
                        <CardContent className="p-6">
                          <Skeleton className="h-8 w-16 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <>
                      <Card className="shadow-sm">
                        <CardContent className="p-6">
                          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                            {adminOverview?.totalOrganizations || 0}
                          </div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Organizations</div>
                        </CardContent>
                      </Card>
                      <Card className="shadow-sm">
                        <CardContent className="p-6">
                          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                            {adminOverview?.totalOwners || 0}
                          </div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Owners</div>
                        </CardContent>
                      </Card>
                      <Card className="shadow-sm">
                        <CardContent className="p-6">
                          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                            {adminOverview?.totalSuperAdmins || 0}
                          </div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Super Admins</div>
                        </CardContent>
                      </Card>
                      <Card className="shadow-sm">
                        <CardContent className="p-6">
                          <div className="text-3xl font-bold text-destructive mb-1">
                            {adminOverview?.totalSuspendedOrganizations || 0}
                          </div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Suspended Orgs</div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
