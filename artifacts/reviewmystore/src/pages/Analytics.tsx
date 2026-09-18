import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  MousePointerClick,
  QrCode,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import {
  getGetDashboardSummaryQueryKey,
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const metricCards = [
  { key: "locations", label: "Locations", icon: Store, color: "text-primary", background: "bg-primary/10" },
  { key: "campaigns", label: "Active campaigns", icon: Megaphone, color: "text-amber-600 dark:text-amber-400", background: "bg-amber-500/10" },
  { key: "scans", label: "QR scans", icon: QrCode, color: "text-blue-600 dark:text-blue-400", background: "bg-blue-500/10" },
  { key: "redirects", label: "Google actions", icon: ExternalLink, color: "text-emerald-600 dark:text-emerald-400", background: "bg-emerald-500/10" },
] as const;

export default function Analytics() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetDashboardSummaryQueryKey(),
    },
  });

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (summary?.needsOnboarding) return <Redirect to="/onboarding" />;

  const values: Record<(typeof metricCards)[number]["key"], number> = {
    locations: summary?.totalBusinesses ?? 0,
    campaigns: summary?.activeCampaigns ?? 0,
    scans: summary?.qrScans ?? 0,
    redirects: summary?.googleRedirects ?? 0,
  };
  const scanToGoogleRate = summary?.qrScans
    ? Math.round((summary.googleRedirects / summary.qrScans) * 100)
    : 0;

  return (
    <AppLayout title="Insights">
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <BarChart3 className="h-4 w-4" />
              Agency performance
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Your reputation at a glance</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              A combined view of every location, campaign and customer action across the agency.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5 text-xs">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            All locations
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <Card key={metric.key} className="border-border shadow-sm">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  {isLoading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className="mt-2 text-3xl font-bold tracking-tight">{values[metric.key]}</p>}
                  {metric.key === "locations" && (
                    <p className="mt-1 text-xs text-muted-foreground">{summary?.activeBusinesses ?? 0} active now</p>
                  )}
                  {metric.key === "scans" && (
                    <p className="mt-1 text-xs text-muted-foreground">{summary?.scansToday ?? 0} today</p>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.background} ${metric.color}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Campaign performance</CardTitle>
              <CardDescription>Top campaigns across all agency locations, ranked by QR scans.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                </div>
              ) : summary?.topCampaigns.length ? (
                <div className="space-y-3">
                  {summary.topCampaigns.map((campaign, index) => (
                    <div key={campaign.campaignId ?? index} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{campaign.campaignName}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Store className="h-3 w-3" />
                          {campaign.businessName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{campaign.scans}</p>
                        <p className="text-[10px] text-muted-foreground">QR scans</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={QrCode} title="No campaign activity yet" description="Create a campaign and share its QR code to start measuring performance." />
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Agency conversion</CardTitle>
              <CardDescription>How customer scans turn into Google actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl bg-primary/5 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scan to Google action rate</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-primary">{scanToGoogleRate}%</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(scanToGoogleRate, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PerformanceStat icon={MousePointerClick} label="Google actions" value={summary?.googleRedirects ?? 0} />
                <PerformanceStat icon={Sparkles} label="AI drafts" value={summary?.reviewsGenerated ?? 0} />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>Metrics combine all active locations in this agency.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Recent agency activity</CardTitle>
            <CardDescription>The latest changes and customer actions across your locations.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
              </div>
            ) : summary?.recentActivity.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {summary.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      {activity.type === "qr_scan" ? <QrCode className="h-4 w-4" /> : activity.type === "google_redirect" ? <ExternalLink className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="No activity yet" description="Your agency's activity will appear here as locations and campaigns get used." />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function PerformanceStat({ icon: Icon, label, value }: { icon: typeof MousePointerClick; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof QrCode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}