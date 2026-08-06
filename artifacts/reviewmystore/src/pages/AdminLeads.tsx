import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Inbox,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
} from "lucide-react";
import {
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
  useListDemoRequests,
  getListDemoRequestsQueryKey,
  useSetDemoRequestStatus,
  type DemoRequest,
  type DemoRequestStatus,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  DemoRequestStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20",
  },
  CONTACTED: {
    label: "Contacted",
    className:
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  CLOSED: {
    label: "Closed",
    className:
      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
};

function LeadCard({ lead }: { lead: DemoRequest }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: setStatus, isPending } = useSetDemoRequestStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListDemoRequestsQueryKey(),
        });
      },
      onError: () => {
        toast({
          title: "Couldn't update lead",
          description: "The status change didn't save. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const meta = STATUS_META[lead.status];

  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">
                {lead.name}
              </h3>
              <Badge variant="outline" className={cn("shrink-0", meta.className)}>
                {meta.label}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {lead.email}
              </a>
              {lead.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {lead.phone}
                </span>
              )}
              {lead.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {lead.company}
                </span>
              )}
              {lead.locations && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {lead.locations} location{lead.locations === "1" ? "" : "s"}
                </span>
              )}
            </div>

            {lead.message && (
              <p className="mt-3 text-sm text-foreground/80 bg-secondary/50 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                {lead.message}
              </p>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(lead.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>

          <div className="shrink-0 sm:w-40">
            <Select
              value={lead.status}
              disabled={isPending}
              onValueChange={(value) =>
                setStatus({
                  id: lead.id,
                  data: { status: value as DemoRequestStatus },
                })
              }
            >
              <SelectTrigger aria-label="Lead status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminLeads() {
  const { isLoaded, isSignedIn } = useAuth();

  const { data: session, isLoading: sessionLoading } = useGetCurrentUser({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const { data, isLoading } = useListDemoRequests({
    query: {
      enabled: !!isSignedIn && isSuperAdmin,
      queryKey: getListDemoRequestsQueryKey(),
    },
  });

  if (!isLoaded || (isSignedIn && sessionLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  if (session && !isSuperAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const leads = data?.demoRequests ?? [];
  const newCount = leads.filter((l) => l.status === "NEW").length;

  return (
    <AppLayout title="Demo Requests">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Demo Requests
          </h2>
          <p className="text-muted-foreground mt-1">
            Leads from the marketing site's Book a Demo form
            {leads.length > 0 && (
              <>
                {" "}
                — {leads.length} total{newCount > 0 && `, ${newCount} new`}
              </>
            )}
            .
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-sm border-border">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Card className="shadow-sm border-border">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground">No demo requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                When visitors submit the Book a Demo form on the marketing
                site, their details will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
