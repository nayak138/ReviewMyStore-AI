import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetReviewDashboard,
  getGetReviewDashboardQueryKey,
  useStartReviewProviderConnection,
  useSyncReviewProvider,
  useListManagedReviews,
  getListManagedReviewsQueryKey,
  useGenerateManagedReviewDraft,
  usePublishManagedReviewReply,
  useDeleteManagedReviewReply,
  type ManagedReview,
  ReviewResponseStatus,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquare, RefreshCw, AlertCircle, Bot, Send, Trash2, Edit3, Search, Store } from "lucide-react";

// bundle.social's Free plan allows 5 review imports/month; Pro/Business
// default to 200. We don't know which plan the account is on, only the
// remaining count, so warn generously once it gets low.
function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function ReviewItem({ review }: { review: ManagedReview }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingPublishComment, setPendingPublishComment] = useState<string | null>(null);

  const dashboardKey = getGetReviewDashboardQueryKey();
  const listKeyPrefix = getListManagedReviewsQueryKey();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKey });
    queryClient.invalidateQueries({ queryKey: listKeyPrefix });
  };

  const generate = useGenerateManagedReviewDraft({
    mutation: {
      onSuccess: (data) => {
        invalidate();
        setComment(data.review.draftReplyText || "");
        setIsEditing(true);
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || "Failed to generate draft";
        toast({ title: msg, variant: "destructive" });
      }
    }
  });

  const publish = usePublishManagedReviewReply({
    mutation: {
      onSuccess: () => {
        invalidate();
        setIsEditing(false);
        toast({ title: "Reply published to Google" });
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || "Failed to publish reply";
        toast({ title: msg, variant: "destructive" });
      }
    }
  });

  const remove = useDeleteManagedReviewReply({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Reply removed" });
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || "Failed to remove reply";
        toast({ title: msg, variant: "destructive" });
      }
    }
  });

  const requestPublish = (nextComment: string) => {
    if (!nextComment.trim()) return;
    setPendingPublishComment(nextComment.trim());
  };

  const handlePublish = () => {
    if (!pendingPublishComment) return;
    publish.mutate({ id: review.id, data: { comment: pendingPublishComment } });
    setPendingPublishComment(null);
  };

  const handleWriteReply = () => {
    setComment(review.draftReplyText || "");
    setIsEditing(true);
  };

  const hasDraft = review.responseStatus === "DRAFT" || !!review.draftReplyText;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {review.reviewerPhotoUrl ? (
              <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {review.reviewerName ? review.reviewerName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{review.reviewerName}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {review.reviewCreatedAt ? new Date(review.reviewCreatedAt).toLocaleDateString() : 'Unknown date'} 
                <span>&bull;</span> 
                <Store className="w-3 h-3 inline" />
                {review.locationName}
              </p>
            </div>
          </div>
          <div className="flex items-center text-amber-500 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
               <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-muted/30'}`} />
            ))}
          </div>
        </div>

        <p className="text-foreground leading-relaxed text-sm md:text-base">
          {review.comment || <span className="italic text-muted-foreground">No text provided by the reviewer.</span>}
        </p>
        {review.sensitiveReason && (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          >
            <AlertCircle className="mr-1 h-3 w-3" />
            {review.sensitiveReason}
          </Badge>
        )}
      </div>

      <div className="bg-secondary/30 p-5 md:p-6 border-t border-border">
        {review.responseStatus === "PUBLISHED" ? (
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-primary" />
                 Published Response
               </h4>
               <p className="text-xs text-muted-foreground">{review.replyUpdatedAt ? new Date(review.replyUpdatedAt).toLocaleDateString() : ''}</p>
             </div>
             <p className="text-sm text-foreground bg-background p-4 rounded-lg border border-border shadow-sm whitespace-pre-wrap">{review.replyText}</p>
             <div className="pt-2 flex justify-end">
               <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remove.mutate({id: review.id})} disabled={remove.isPending}>
                 <Trash2 className="w-3.5 h-3.5 mr-2" />
                 Remove Reply
               </Button>
             </div>
           </div>
        ) : isEditing || (review.responseStatus === "DRAFT" && !isEditing && review.draftReplyText) ? (
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                 {isEditing ? "Editing Reply" : "Review Draft"}
               </h4>
               {review.draftGeneratedAt && (
                 <Badge variant="secondary" className="text-xs font-normal border-primary/20 text-primary">AI Generated</Badge>
               )}
             </div>
             {isEditing ? (
               <Textarea 
                 value={comment} 
                 onChange={(e) => setComment(e.target.value)} 
                 placeholder="Write your response here..."
                 className="min-h-[120px] bg-background resize-y text-sm leading-relaxed"
               />
             ) : (
               <div className="p-4 bg-background border border-border rounded-lg text-sm text-foreground whitespace-pre-wrap">
                 {review.draftReplyText}
               </div>
             )}
             
             <div className="flex items-center justify-end gap-3 pt-2">
               {isEditing ? (
                 <>
                   <Button variant="ghost" size="sm" onClick={() => {
                      setIsEditing(false);
                      setComment(review.draftReplyText || "");
                   }}>
                     Cancel
                   </Button>
                    <Button size="sm" onClick={() => requestPublish(comment)} disabled={publish.isPending || !comment.trim()} className="shadow-sm">
                     <Send className="w-3.5 h-3.5 mr-2" />
                     {publish.isPending ? "Publishing..." : "Publish to Google"}
                   </Button>
                 </>
               ) : (
                 <>
                   <Button variant="outline" size="sm" onClick={handleWriteReply}>
                     <Edit3 className="w-3.5 h-3.5 mr-2" />
                     Edit Draft
                   </Button>
                    <Button
                      size="sm"
                      className="shadow-sm"
                      onClick={() => requestPublish(review.draftReplyText || "")}
                      disabled={publish.isPending || !review.draftReplyText?.trim()}
                    >
                     <Send className="w-3.5 h-3.5 mr-2" />
                     {publish.isPending ? "Publishing..." : "Publish Draft"}
                   </Button>
                 </>
               )}
             </div>
           </div>
        ) : (
           <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" onClick={handleWriteReply}>
               <Edit3 className="w-3.5 h-3.5 mr-2" />
               {hasDraft ? "Edit Draft" : "Write Reply"}
             </Button>
             <Button 
               variant="default" 
               size="sm" 
               onClick={() => generate.mutate({id: review.id})} 
               disabled={generate.isPending} 
               className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
             >
               {generate.isPending ? (
                 <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
               ) : (
                 <Bot className="w-3.5 h-3.5 mr-2" />
               )}
               {generate.isPending ? "Drafting..." : "Generate AI Draft"}
             </Button>
           </div>
        )}
      </div>
      <AlertDialog
        open={pendingPublishComment !== null}
        onOpenChange={(open) => !open && setPendingPublishComment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this reply to Google?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts the edited reply publicly under your business profile. AI drafts always require this approval step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Publish reply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Reviews() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [locationId, setLocationId] = useState<string>("all");
  const [rating, setRating] = useState<string>("all");
  const [responseStatus, setResponseStatus] = useState<string>("all");

  const dashboardKey = getGetReviewDashboardQueryKey();
  const { data: dashboard, isLoading: dashboardLoading } = useGetReviewDashboard({
    query: { enabled: !!isSignedIn, queryKey: dashboardKey }
  });

  const listParams = {
    locationId: locationId === "all" ? undefined : locationId,
    rating: rating === "all" ? undefined : Number(rating),
    responseStatus: responseStatus === "all" ? undefined : (responseStatus as ReviewResponseStatus),
    search: debouncedSearch || undefined
  };

  const listKey = getListManagedReviewsQueryKey(listParams);
  const { data: reviewsData, isLoading: reviewsLoading } = useListManagedReviews(listParams, {
    query: { 
      enabled: !!isSignedIn && dashboard?.connection.status === "CONNECTED", 
      queryKey: listKey 
    }
  });
  const reviews = reviewsData?.reviews ?? [];

  const startConnection = useStartReviewProviderConnection({
    mutation: {
      onSuccess: (data) => {
        // Google blocks OAuth inside iframes (e.g. the workspace preview),
        // so the hosted connect flow must run in a top-level tab.
        //
        // NOTE: don't pass the "noopener" window feature here. Per the
        // WHATWG spec, "noopener" makes window.open() itself return null
        // even when the tab opens successfully, which would make the
        // `if (opened)` check below always false and wrongly navigate this
        // (the original) tab away on every click, defeating the whole
        // point of opening a new tab. Instead, get a real handle so we can
        // detect an actually-blocked popup, and neutralize `window.opener`
        // manually for the same tabnabbing protection "noopener" provides.
        const opened = window.open(data.authUrl, "_blank");
        if (opened) {
          try {
            opened.opener = null;
          } catch {
            // Cross-origin restrictions may prevent this; safe to ignore.
          }
          toast({
            title: "Complete the connection in the new tab",
            description: "Sign in with Google there, then come back and press Sync reviews."
          });
        } else {
          // Pop-up genuinely blocked: fall back to navigating this window.
          window.location.href = data.authUrl;
        }
        // The backend has already moved the connection to PENDING at this
        // point. Without refreshing the cached dashboard now, this tab's
        // `dashboard.connection.status` stays DISCONNECTED, the PENDING-only
        // focus/visibility listener below never mounts, and the user comes
        // back from Google to a page that silently never auto-syncs.
        queryClient.invalidateQueries({ queryKey: dashboardKey });
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || "Failed to start connection";
        toast({ title: msg, variant: "destructive" });
      }
    }
  });

  const syncProvider = useSyncReviewProvider({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKey });
        queryClient.invalidateQueries({ queryKey: getListManagedReviewsQueryKey() });
        toast({ title: "Reviews synced successfully" });
      },
      onError: (err: any) => {
        const msg = err.response?.data?.message || "Failed to sync reviews";
        toast({ title: msg, variant: "destructive" });
      }
    }
  });

  // Connecting happens in a separate tab (Google refuses OAuth in an iframe).
  // Our local status only flips from PENDING to CONNECTED once a sync runs,
  // so auto-trigger a sync when the user comes back to this tab instead of
  // leaving them stuck on "Connection Pending" with no obvious next step.
  useEffect(() => {
    if (dashboard?.connection.status !== "PENDING") return;
    const trySync = () => {
      if (document.visibilityState === "visible" && !syncProvider.isPending) {
        syncProvider.mutate();
      }
    };
    window.addEventListener("focus", trySync);
    document.addEventListener("visibilitychange", trySync);
    return () => {
      window.removeEventListener("focus", trySync);
      document.removeEventListener("visibilitychange", trySync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.connection.status]);

  if (isLoaded && !isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  if (dashboardLoading) {
    return (
      <AppLayout title="Reviews">
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (dashboard?.connection.status === "DISCONNECTED" || dashboard?.connection.status === "ERROR") {
    return (
      <AppLayout title="Reviews">
        <div className="p-4 md:p-8 max-w-4xl mx-auto mt-12 md:mt-24 text-center space-y-6 animate-in fade-in duration-700">
           <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto border border-border shadow-sm">
             <MessageSquare className="w-10 h-10 text-muted-foreground" />
           </div>
           <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Connect your Google Business</h2>
           <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
             Sync your Google reviews directly to ReviewMyStore. Reply to customers, generate thoughtful AI responses, and manage your reputation safely.
           </p>
           <Button 
             size="lg" 
             className="mt-6 shadow-md"
             disabled={startConnection.isPending}
             onClick={() => startConnection.mutate()}
           >
             {startConnection.isPending ? (
               <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
             ) : (
               <Store className="w-5 h-5 mr-2" />
             )}
             {startConnection.isPending ? "Connecting..." : "Connect Google Business"}
           </Button>
           {dashboard.connection.status === "ERROR" && (
             <div className="max-w-md mx-auto mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-3 text-left">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
               <p className="text-sm leading-relaxed">
                 {dashboard.connection.lastError || "There was an issue connecting your account. Please try again."}
               </p>
             </div>
           )}
        </div>
      </AppLayout>
    );
  }

  if (dashboard?.connection.status === "PENDING") {
    return (
      <AppLayout title="Reviews">
        <div className="p-4 md:p-8 max-w-4xl mx-auto mt-12 md:mt-24 text-center space-y-6 animate-in fade-in duration-700">
           <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
             <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
           </div>
           <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Connection Pending</h2>
           <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
             If you already signed in and selected a location in the other tab, sync now to finish connecting. Otherwise, reopen the connection tab or start again.
           </p>
           <div className="flex items-center justify-center gap-3 mt-6">
             <Button
               size="lg"
               className="shadow-sm"
               disabled={syncProvider.isPending}
               onClick={() => syncProvider.mutate()}
             >
               {syncProvider.isPending ? (
                 <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
               ) : (
                 <RefreshCw className="w-5 h-5 mr-2" />
               )}
               I've connected — Sync now
             </Button>
             <Button
               variant="outline"
               size="lg"
               className="shadow-sm"
               disabled={startConnection.isPending}
               onClick={() => startConnection.mutate()}
             >
               Retry Connection
             </Button>
           </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reviews">
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Review Inbox</h2>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage, filter, and respond to your customer feedback.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground hidden sm:block px-2">
              Last synced: {dashboard?.connection.lastSyncedAt ? new Date(dashboard?.connection.lastSyncedAt).toLocaleString() : 'Never'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-background shadow-sm"
              onClick={() => syncProvider.mutate()} 
              disabled={syncProvider.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncProvider.isPending ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        </div>

        {dashboard?.connection.remainingImportCapacity !== null &&
          dashboard?.connection.remainingImportCapacity !== undefined &&
          dashboard.connection.remainingImportCapacity <= IMPORT_CAPACITY_WARNING_THRESHOLD && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/50">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed">
                {dashboard.connection.remainingImportCapacity <= 0 ? (
                  <>
                    <span className="font-semibold">You've reached your monthly Google review import limit.</span>{" "}
                    New reviews won't be imported until your plan resets next month.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">
                      Only {dashboard.connection.remainingImportCapacity} review import{dashboard.connection.remainingImportCapacity === 1 ? "" : "s"} left this month.
                    </span>{" "}
                    You're close to your monthly Google review import limit.
                  </>
                )}{" "}
                <a
                  href="https://bundle.social/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-200"
                >
                  Upgrade on bundle.social
                </a>{" "}
                to import more.
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Store className="w-4 h-4" /> Total Reviews
              </div>
              <div className="text-3xl font-bold text-foreground">{dashboard?.summary.totalReviews || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-500 mb-2">
                <AlertCircle className="w-4 h-4" /> Needs Reply
              </div>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-500">{dashboard?.summary.needsReply || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-500 mb-2">
                <MessageSquare className="w-4 h-4" /> Replied
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">{dashboard?.summary.replied || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Search reviews..." 
              className="pl-9 bg-background h-10" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-full md:w-[200px] bg-background h-10">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {dashboard?.locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger className="w-full md:w-[140px] bg-background h-10">
              <SelectValue placeholder="Any Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Rating</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responseStatus} onValueChange={setResponseStatus}>
            <SelectTrigger className="w-full md:w-[160px] bg-background h-10">
              <SelectValue placeholder="Any Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="PENDING">Needs Reply</SelectItem>
              <SelectItem value="DRAFT">Has Draft</SelectItem>
              <SelectItem value="PUBLISHED">Replied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {reviewsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))
           ) : reviews.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border border-dashed rounded-xl shadow-sm">
               <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-foreground">No reviews found</h3>
               <p className="text-muted-foreground mt-1 text-sm">
                 {search || rating !== "all" || locationId !== "all" || responseStatus !== "all" 
                   ? "Try adjusting your filters to see more results." 
                   : "You don't have any reviews yet."}
               </p>
            </div>
          ) : (
             reviews.map(review => (
              <ReviewItem key={review.id} review={review} />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const IMPORT_CAPACITY_WARNING_THRESHOLD = 5;
