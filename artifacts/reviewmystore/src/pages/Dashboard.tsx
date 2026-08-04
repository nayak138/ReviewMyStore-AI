import { useAuth } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { 
  Store, 
  Megaphone, 
  QrCode, 
  MessageSquareHeart,
  TrendingUp,
  Clock,
  ArrowRight,
  SmartphoneNfc,
  ExternalLink,
  Trophy
} from "lucide-react";
import { 
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetDashboardSummaryQueryKey(),
    }
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  // Redirect to onboarding if needed
  if (summary && summary.needsOnboarding) {
    return <Redirect to="/onboarding" />;
  }

  const statCards = [
    { 
      title: "Total Businesses", 
      value: summary?.totalBusinesses ?? 0, 
      icon: Store,
      color: "text-primary",
      bgColor: "bg-primary/10",
      ready: true
    },
    { 
      title: "Active Businesses", 
      value: summary?.activeBusinesses ?? 0, 
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      ready: true
    },
    { 
      title: "Active Campaigns", 
      value: summary?.activeCampaigns ?? 0, 
      icon: Megaphone,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      ready: true
    },
    { 
      title: "QR Scans", 
      value: summary?.qrScans ?? 0, 
      icon: QrCode,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      ready: true,
      sub: `${summary?.scansToday ?? 0} today (incl. NFC)`
    },
    { 
      title: "NFC Taps", 
      value: summary?.nfcTaps ?? 0, 
      icon: SmartphoneNfc,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      ready: true
    },
    { 
      title: "AI Reviews Generated", 
      value: summary?.aiReviewsGenerated ?? 0, 
      icon: MessageSquareHeart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      ready: true
    },
    { 
      title: "Google Redirects", 
      value: summary?.googleRedirects ?? 0, 
      icon: ExternalLink,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      ready: true
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Welcome & Action Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Overview
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor your locations, scans, and review campaigns.
            </p>
          </div>
          <Button className="hidden md:flex shadow-sm">
            Quick Actions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, i) => (
              <Card 
                key={i} 
                className={cn(
                  "shadow-sm border-border transition-all duration-300",
                  stat.ready ? "hover:shadow-md hover:border-primary/20" : "opacity-80 grayscale-[0.2]"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-6 relative overflow-hidden group">
                  
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="text-sm font-medium text-muted-foreground">{stat.title}</div>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", stat.bgColor, stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className={cn("text-3xl font-bold relative z-10", !stat.ready && "text-muted-foreground")}>
                    {stat.value}
                  </div>
                  {"sub" in stat && stat.sub && (
                    <div className="text-xs text-muted-foreground mt-1 relative z-10">{stat.sub}</div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Recent Activity */}
          <Card className="lg:col-span-2 shadow-sm border-border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your businesses.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : summary?.recentActivity && summary.recentActivity.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {summary.recentActivity.map((activity, i) => (
                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary/10 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <Store className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm capitalize">{activity.type.toLowerCase()}</span>
                          <time className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </time>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground">No activity yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    As you add locations and generate QR codes, your recent activity will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: Top Campaigns + Quick Links */}
          <div className="space-y-6">
          <Card className="shadow-sm border-border h-fit">
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
              <CardDescription>Ranked by QR scans and NFC taps.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : summary?.topCampaigns && summary.topCampaigns.length > 0 ? (
                <div className="space-y-3">
                  {summary.topCampaigns.map((item, i) => (
                    <div key={item.campaignId ?? i} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        i === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-secondary text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.campaignName}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.businessName}</div>
                      </div>
                      <div className="text-sm font-semibold shrink-0">{item.scans}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Trophy className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    No scans yet — print a QR code or activate an NFC device to start collecting data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border h-fit">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Useful resources to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/businesses" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Manage Businesses</h4>
                  <p className="text-xs text-muted-foreground">Add or edit your locations</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/campaigns" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Manage Campaigns</h4>
                  <p className="text-xs text-muted-foreground">Keywords & review links</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/qr-codes" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Print QR Codes</h4>
                  <p className="text-xs text-muted-foreground">Download PNG, SVG & PDF</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link href="/nfc-devices" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                  <SmartphoneNfc className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">Manage NFC Devices</h4>
                  <p className="text-xs text-muted-foreground">Register & assign tap devices</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>
          </div>
          
        </div>
      </div>
    </AppLayout>
  );
}
