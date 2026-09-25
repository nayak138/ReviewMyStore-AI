import type { ReactNode } from "react";
import type { BusinessUsageSummaryItem } from "@workspace/api-client-react";
import { AlertTriangle, CalendarRange, Info, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function formatUsageWindow(window: BusinessUsageSummaryItem["window"]) {
  return window === "DAILY" ? "today" : "this month";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function UsageMetricRow({ item }: { item: BusinessUsageSummaryItem }) {
  const total = Math.max(0, item.used + item.reserved);
  const percentage = item.limit > 0 ? Math.min(100, Math.round((total / item.limit) * 100)) : 0;
  const allowsMonthlyOverage =
    item.window === "MONTHLY" &&
    [
      "SOCIAL_POSTS_MONTHLY",
      "SOCIAL_COMMENT_IMPORTS",
      "SOCIAL_MEDIA_UPLOADS_MONTHLY",
    ].includes(item.metric);
  const isOverBase = allowsMonthlyOverage && total > item.limit;
  const isBaseReached = allowsMonthlyOverage && total === item.limit;
  const isExhausted = item.remaining <= 0 && !allowsMonthlyOverage;
  const balanceLabel = isOverBase
    ? `${(total - item.limit).toLocaleString()} over base`
    : isBaseReached
      ? "Base reached"
      : `${item.remaining.toLocaleString()} left`;
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        item.nearLimit ? "border-amber-300/70 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-border bg-background",
      )}
      data-testid={`usage-metric-${item.metric.toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            {item.window === "DAILY" ? "Daily allowance" : "Monthly allowance"} · resets {formatDate(item.periodEnd)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 tabular-nums",
            isExhausted ? "border-destructive/30 bg-destructive/10 text-destructive" : item.nearLimit ? "border-amber-400/60 text-amber-800 dark:text-amber-300" : "border-border",
          )}
        >
          {balanceLabel}
        </Badge>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${percentage}% used`}>
        <div
          className={cn("h-full rounded-full transition-[width]", isExhausted ? "bg-destructive" : item.nearLimit ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {item.used.toLocaleString()} used{item.reserved ? ` · ${item.reserved.toLocaleString()} reserved` : ""} of {item.limit.toLocaleString()}
        </span>
        {item.nearLimit && (
          <span className="inline-flex items-center gap-1 font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Near limit
          </span>
        )}
      </div>
    </div>
  );
}

export function UsageSummaryPanel({
  items,
  title = "Usage & allowances",
  description = "Current usage is tracked against the limits assigned to this business.",
  metrics,
  testId = "usage-summary",
}: {
  items: BusinessUsageSummaryItem[];
  title?: string;
  description?: string;
  metrics?: BusinessUsageSummaryItem["metric"][];
  testId?: string;
}) {
  const visibleItems = metrics ? items.filter((item) => metrics.includes(item.metric)) : items;
  if (!visibleItems.length) return null;
  const warnings = visibleItems.filter((item) => item.nearLimit);
  return (
    <TooltipProvider>
      <Card className="border-primary/15 bg-primary/[0.025] shadow-sm" data-testid={testId}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex h-7 w-7 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="How usage is counted">
                  <Info className="h-4 w-4" aria-hidden="true" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Used and reserved units count toward the assigned allowance.</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300/70 bg-amber-50/70 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200" role="status" data-testid={`${testId}-warning`}>
              <span className="font-semibold">Allowance check:</span>{" "}
              {warnings.map((item) => item.label).join(", ")} {warnings.length === 1 ? "is" : "are"} near the assigned limit.
            </div>
          )}
          {visibleItems.map((item) => <UsageMetricRow key={item.metric} item={item} />)}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export function LimitBlockedAction({
  children,
  reason,
  testId,
}: {
  children: ReactNode;
  reason?: string | null;
  testId: string;
}) {
  if (!reason) return <>{children}</>;
  return (
    <TooltipProvider>
      <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={reason}
          data-testid={`${testId}-notice`}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BlockedActionNotice({ reason, testId }: { reason: string; testId: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground" role="status" data-testid={testId}>
      <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {reason}
    </p>
  );
}