import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPrivateFeedback,
  getListPrivateFeedbackQueryKey,
  useUpdatePrivateFeedbackStatus,
  PrivateFeedbackStatus,
  type PrivateFeedbackItem,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getLanguage } from "@/lib/languages";
import { AlertTriangle, Check, MessageCircleWarning, Phone, Star } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  VIEWED: "Viewed",
  RESOLVED: "Resolved",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  NEW: "border-destructive/30 bg-destructive/10 text-destructive",
  VIEWED: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-500",
  RESOLVED: "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-500",
};

function FeedbackCard({ item }: { item: PrivateFeedbackItem }) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdatePrivateFeedbackStatus({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPrivateFeedbackQueryKey() }),
    },
  });

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${index < item.rating ? "fill-warning text-warning" : "fill-transparent text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <Badge variant="outline" className={STATUS_BADGE_CLASS[item.status]}>
                {STATUS_LABEL[item.status]}
              </Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{item.businessName} · {item.campaignName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString()} · {getLanguage(item.language).englishName}
            </p>
          </div>
          <Select
            value={item.status}
            onValueChange={(value) => updateStatus.mutate({ id: item.id, data: { status: value as PrivateFeedbackStatus } })}
          >
            <SelectTrigger className="w-36 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PrivateFeedbackStatus.NEW}>New</SelectItem>
              <SelectItem value={PrivateFeedbackStatus.VIEWED}>Viewed</SelectItem>
              <SelectItem value={PrivateFeedbackStatus.RESOLVED}>Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.message}</p>
        {item.contact && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {item.contact}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Feedback() {
  const { isLoaded, isSignedIn } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const listParams = statusFilter === "all" ? {} : { status: statusFilter as PrivateFeedbackStatus };
  const { data, isLoading } = useListPrivateFeedback(listParams, {
    query: { enabled: !!isSignedIn, queryKey: getListPrivateFeedbackQueryKey(listParams) },
  });

  if (isLoaded && !isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  const feedback = data?.feedback ?? [];
  const newCount = feedback.filter((item) => item.status === "NEW").length;

  return (
    <AppLayout title="Private Feedback">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Private Feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              Messages from customers who rated their experience below 3 stars — kept private, never posted publicly.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full bg-background md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={PrivateFeedbackStatus.NEW}>New</SelectItem>
              <SelectItem value={PrivateFeedbackStatus.VIEWED}>Viewed</SelectItem>
              <SelectItem value={PrivateFeedbackStatus.RESOLVED}>Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {newCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            <MessageCircleWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{newCount} new message{newCount === 1 ? "" : "s"} you haven't reviewed yet.</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="mt-12 space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <AlertTriangle className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No private feedback yet</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              When a customer rates their experience below 3 stars on your review page, their message shows up here instead of on Google.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
