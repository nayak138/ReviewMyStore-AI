import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageCircleWarning,
  MousePointerClick,
  QrCode,
  Star,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import {
  getGetBusinessAnalyticsQueryKey,
  useGetBusinessAnalytics,
  type BusinessAnalytics,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { BusinessTabs } from "@/components/business/business-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const CHART_COLORS = {
  primary: "hsl(221, 68%, 39%)",
  blue: "hsl(210, 80%, 52%)",
  amber: "hsl(39, 92%, 47%)",
  green: "hsl(145, 42%, 34%)",
  rose: "hsl(350, 70%, 55%)",
  muted: "hsl(220, 13%, 60%)",
};

const FEEDBACK_COLORS = [
  CHART_COLORS.rose,
  CHART_COLORS.amber,
  CHART_COLORS.muted,
];

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  VIEWED: "Viewed",
  RESOLVED: "Resolved",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: CHART_COLORS.rose,
  VIEWED: CHART_COLORS.amber,
  RESOLVED: CHART_COLORS.green,
};

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatPeriod(start: string, end: string) {
  return `${new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function downloadAnalyticsWorkbook(analytics: BusinessAnalytics) {
  const workbook = XLSX.utils.book_new();
  const { summary } = analytics;
  const summaryRows = [
    { Metric: "Business", Value: analytics.businessName },
    { Metric: "Reporting period", Value: formatPeriod(analytics.periodStart, analytics.periodEnd) },
    { Metric: "QR scans", Value: summary.qrScans },
    { Metric: "NFC taps", Value: summary.nfcTaps },
    { Metric: "Google actions", Value: summary.googleRedirects },
    { Metric: "Scan to Google rate", Value: `${summary.scanToGoogleRate}%` },
    { Metric: "Active campaigns", Value: summary.activeCampaigns },
    { Metric: "Total campaigns", Value: summary.totalCampaigns },
    { Metric: "Private feedback", Value: summary.privateFeedback },
    { Metric: "Average feedback rating", Value: summary.averageFeedbackRating },
    { Metric: "New feedback", Value: summary.newFeedback },
    { Metric: "Resolved feedback", Value: summary.resolvedFeedback },
    { Metric: "AI review drafts generated", Value: summary.aiReviewsGenerated },
  ];
  const dailyRows = analytics.dailyTrend.map((point) => ({
    Date: point.date,
    "QR scans": point.qrScans,
    "NFC taps": point.nfcTaps,
    "Google actions": point.googleRedirects,
    "Private feedback": point.privateFeedback,
  }));
  const campaignRows = analytics.campaignPerformance.map((campaign) => ({
    Campaign: campaign.campaignName,
    Status: campaign.status,
    "QR scans": campaign.qrScans,
    "NFC taps": campaign.nfcTaps,
    "Google actions": campaign.googleRedirects,
    "Total actions": campaign.totalActions,
  }));
  const feedbackRows = [
    ...analytics.feedbackByRating.map((item) => ({
      Breakdown: "Rating",
      Category: `${item.rating} stars`,
      Count: item.count,
    })),
    ...analytics.feedbackByStatus.map((item) => ({
      Breakdown: "Status",
      Category: STATUS_LABEL[item.status] ?? item.status,
      Count: item.count,
    })),
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), "Daily activity");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(campaignRows), "Campaigns");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(feedbackRows), "Feedback");

  const safeName = analytics.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  XLSX.writeFile(workbook, `${safeName || "business"}-analytics.xlsx`);
}

export default function BusinessAnalytics() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const businessId = params.get("businessId") ?? "";
  const routeBusinessName = params.get("businessName") ?? "";
  const analyticsParams = { businessId, days: 30 };
  const { data: analytics, isLoading, isError } = useGetBusinessAnalytics(
    analyticsParams,
    {
      query: {
        enabled: !!isSignedIn && !!businessId,
        queryKey: getGetBusinessAnalyticsQueryKey(analyticsParams),
      },
    },
  );

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (!businessId) return <Redirect to="/businesses" />;

  const businessName = analytics?.businessName ?? (routeBusinessName || "Business");
  const summary = analytics?.summary;

  const handleDownload = () => {
    if (!analytics) return;
    downloadAnalyticsWorkbook(analytics);
    toast({ title: "Analytics workbook downloaded" });
  };

  return (
    <AppLayout title="Analytics" businessName={businessName}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <BusinessTabs businessId={businessId} businessName={businessName} active="analytics" />

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <BarChart3 className="h-4 w-4" />
              Business performance
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Understand what brings customers in</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              See how this business&apos;s review pages are discovered, which campaigns create action, and where feedback needs attention.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              {analytics ? formatPeriod(analytics.periodStart, analytics.periodEnd) : "Last 30 days"}
            </Badge>
            <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={!analytics || isLoading}>
              <Download className="h-4 w-4" />
              Download XLSX
            </Button>
          </div>
        </div>

        {isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Analytics could not be loaded</p>
              <p className="mt-1 text-destructive/80">Refresh the page and try again. If the problem continues, check that this business is still active in your workspace.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="QR scans" value={summary?.qrScans} helper="Customers opening QR links" icon={QrCode} color="text-blue-600 dark:text-blue-400" background="bg-blue-500/10" isLoading={isLoading} />
              <MetricCard label="NFC taps" value={summary?.nfcTaps} helper="Customers tapping NFC tags" icon={Smartphone} color="text-primary" background="bg-primary/10" isLoading={isLoading} />
              <MetricCard label="Google actions" value={summary?.googleRedirects} helper={`${summary?.scanToGoogleRate ?? 0}% of QR scans`} icon={ExternalLink} color="text-emerald-600 dark:text-emerald-400" background="bg-emerald-500/10" isLoading={isLoading} />
              <MetricCard label="Private feedback" value={summary?.privateFeedback} helper={`${summary?.newFeedback ?? 0} still needs attention`} icon={MessageCircleWarning} color="text-rose-600 dark:text-rose-400" background="bg-rose-500/10" isLoading={isLoading} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Customer activity</CardTitle>
                  <CardDescription>Daily discovery and Google actions over the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> : analytics?.dailyTrend.length ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.dailyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="qrFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="googleFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.22} />
                              <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                          <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={28} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                          <Tooltip labelFormatter={(label) => formatDate(String(label))} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Legend verticalAlign="top" height={32} />
                          <Area type="monotone" dataKey="qrScans" name="QR scans" stroke={CHART_COLORS.blue} fill="url(#qrFill)" strokeWidth={2} />
                          <Area type="monotone" dataKey="nfcTaps" name="NFC taps" stroke={CHART_COLORS.primary} fill="transparent" strokeWidth={2} />
                          <Area type="monotone" dataKey="googleRedirects" name="Google actions" stroke={CHART_COLORS.green} fill="url(#googleFill)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart icon={Activity} title="No activity yet" description="Share a campaign link or place a QR code to start measuring customer activity." />}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Feedback pulse</CardTitle>
                  <CardDescription>Private feedback by status.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> : (analytics?.feedbackByStatus.some((item) => item.count > 0) ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analytics.feedbackByStatus} dataKey="count" nameKey="status" innerRadius={68} outerRadius={102} paddingAngle={4}>
                            {analytics.feedbackByStatus.map((item) => <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? CHART_COLORS.muted} />)}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, STATUS_LABEL[String(name)] ?? name]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Legend formatter={(value) => STATUS_LABEL[String(value)] ?? value} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart icon={MessageCircleWarning} title="No private feedback" description="Low-rated customer feedback will appear here for your team to follow up." />)}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Feedback ratings</CardTitle>
                  <CardDescription>How private feedback is distributed by rating.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> : (analytics?.feedbackByRating.length ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.feedbackByRating} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                          <XAxis dataKey="rating" tickFormatter={(value) => `${value}★`} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                          <Tooltip labelFormatter={(value) => `${value} star rating`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="count" name="Feedback" radius={[6, 6, 0, 0]}>
                            {analytics.feedbackByRating.map((item, index) => <Cell key={item.rating} fill={FEEDBACK_COLORS[index % FEEDBACK_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart icon={Star} title="No ratings to compare" description="Your feedback rating breakdown will appear after customers leave private feedback." />)}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Campaign performance</CardTitle>
                  <CardDescription>Customer actions generated by each campaign.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> : (analytics?.campaignPerformance.length ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.campaignPerformance.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 8, left: 16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/60" />
                          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="campaignName" width={100} tickLine={false} axisLine={false} tickFormatter={(value) => String(value).length > 16 ? `${String(value).slice(0, 16)}…` : value} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="totalActions" name="Actions" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyChart icon={TrendingUp} title="No campaigns yet" description="Create a campaign to see which customer touchpoints create the most action." />)}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">At a glance</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {summary ? `${numberFormatter.format(summary.totalActions)} customer touchpoints and ${summary.averageFeedbackRating || "no"} average feedback rating in this reporting period.` : "Your business performance summary will appear here."}
                    </p>
                  </div>
                </div>
                {summary && summary.resolvedFeedback > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {summary.resolvedFeedback} feedback items resolved
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  color,
  background,
  isLoading,
}: {
  label: string;
  value?: number;
  helper: string;
  icon: typeof QrCode;
  color: string;
  background: string;
  isLoading: boolean;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {isLoading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className="mt-2 text-3xl font-bold tracking-tight">{numberFormatter.format(value ?? 0)}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[260px] w-full rounded-xl" />;
}

function EmptyChart({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}