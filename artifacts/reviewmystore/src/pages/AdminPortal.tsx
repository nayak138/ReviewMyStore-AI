import { useEffect, useMemo, useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminPortalQueryKey,
  getGetCurrentUserQueryKey,
  getListAdminDeactivationRequestsQueryKey,
  useCreateAdminAgency,
  useCreateAdminAgencyInvitation,
  useGetAdminPortal,
  useGetCurrentUser,
  useListAdminDeactivationRequests,
  useRevokeAdminAgencyInvitation,
  useReviewAdminDeactivationRequest,
  useUpdateAdminAgency,
  type AdminAgency,
  type AdminDeactivationRequest,
  type OrganizationPlan,
  type OrganizationStatus,
  type SubscriptionStatus,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Link2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const plans: OrganizationPlan[] = ["STARTER", "GROWTH", "PRO", "ENTERPRISE"];
const subscriptionStatuses: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"];

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "Never";
}

function signupUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}${path}`;
}

function statusClass(status: OrganizationStatus) {
  return status === "ACTIVE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-400"
    : "border-destructive/30 bg-destructive/10 text-destructive";
}

function deactivationStatusClass(status: AdminDeactivationRequest["status"]) {
  if (status === "PENDING_REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300";
  }
  if (status === "APPROVED") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}

function DeactivationQueue({
  requests,
  isLoading,
  onReviewed,
}: {
  requests: AdminDeactivationRequest[];
  isLoading: boolean;
  onReviewed: () => void;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const review = useReviewAdminDeactivationRequest({
    mutation: {
      onSuccess: (result) => {
        onReviewed();
        toast({
          title: result.status === "APPROVED" ? "Account deactivated" : "Request rejected",
          description: `${result.userName}'s request has been recorded.`,
        });
      },
      onError: (error) =>
        toast({
          title: "Couldn't review request",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        }),
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (requests.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">No deactivation requests</p>
            <p className="mt-1 text-sm text-muted-foreground">New requests will appear here for review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const isPending = request.status === "PENDING_REVIEW";
        return (
          <Card key={request.id} className="border-border shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{request.userName}</p>
                    <Badge variant="outline" className={deactivationStatusClass(request.status)}>
                      {request.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{request.userEmail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.organizationName ? `${request.organizationName} · ` : "Platform account · "}
                    Requested {formatDate(request.requestedAt)}
                  </p>
                </div>
                {isPending ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({
                          id: request.id,
                          data: { status: "REJECTED", reviewerNote: notes[request.id] || undefined },
                        })
                      }
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({
                          id: request.id,
                          data: { status: "APPROVED", reviewerNote: notes[request.id] || undefined },
                        })
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </div>
                ) : (
                  <div className="text-right text-xs text-muted-foreground">
                    Reviewed {formatDate(request.reviewedAt)}
                  </div>
                )}
              </div>
              {isPending ? (
                <Input
                  value={notes[request.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                  placeholder="Optional reviewer note"
                  aria-label={`Reviewer note for ${request.userName}`}
                  maxLength={2000}
                />
              ) : request.reviewerNote ? (
                <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{request.reviewerNote}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AgencyCard({
  agency,
  onLinkCreated,
}: {
  agency: AdminAgency;
  onLinkCreated: (path: string) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quota, setQuota] = useState(String(agency.aiQuota));
  const [businessesLimit, setBusinessesLimit] = useState(String(agency.businessesLimit));
  const [inviteEmail, setInviteEmail] = useState(agency.owner?.email ?? "");

  useEffect(() => {
    setQuota(String(agency.aiQuota));
    setBusinessesLimit(String(agency.businessesLimit));
    setInviteEmail(agency.owner?.email ?? "");
  }, [agency.aiQuota, agency.businessesLimit, agency.owner?.email]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminPortalQueryKey() });

  const update = useUpdateAdminAgency({
    mutation: {
      onSuccess: () => {
        void invalidate();
        toast({ title: "Agency updated", description: `${agency.name} settings were saved.` });
      },
      onError: () =>
        toast({
          title: "Couldn't update agency",
          description: "The change didn't save. Please try again.",
          variant: "destructive",
        }),
    },
  });
  const createInvite = useCreateAdminAgencyInvitation({
    mutation: {
      onSuccess: (data) => {
        void invalidate();
        onLinkCreated(data.signupPath);
        toast({ title: "Signup link created", description: "Copy it and send it to the agency owner." });
      },
      onError: (error) =>
        toast({
          title: "Couldn't create signup link",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        }),
    },
  });
  const revokeInvite = useRevokeAdminAgencyInvitation({
    mutation: {
      onSuccess: () => {
        void invalidate();
        toast({ title: "Signup link revoked" });
      },
    },
  });

  const saveLimits = () =>
    update.mutate({
      id: agency.id,
      data: {
        aiQuota: Math.max(0, Number(quota) || 0),
        businessesLimit: Math.max(1, Number(businessesLimit) || 1),
      },
    });

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">{agency.name}</CardTitle>
              <Badge variant="outline" className={statusClass(agency.status)}>
                {agency.status === "ACTIVE" ? "Active" : "Suspended"}
              </Badge>
              <Badge variant="secondary">{agency.plan}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">/{agency.slug} · Joined {formatDate(agency.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {agency.businessCount} business{agency.businessCount === 1 ? "" : "es"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agency owner</p>
            {agency.owner ? (
              <>
                <p className="mt-1 font-medium text-foreground">{agency.owner.name}</p>
                <p className="text-sm text-muted-foreground">{agency.owner.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Last login: {formatDate(agency.owner.lastLoginAt)}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Invitation pending</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select
                value={agency.plan}
                disabled={update.isPending}
                onValueChange={(value) =>
                  update.mutate({ id: agency.id, data: { plan: value as OrganizationPlan } })
                }
              >
                <SelectTrigger aria-label={`${agency.name} plan`}><SelectValue /></SelectTrigger>
                <SelectContent>{plans.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}</SelectContent>
              </Select>
              <Select
                value={agency.subscriptionStatus}
                disabled={update.isPending}
                onValueChange={(value) =>
                  update.mutate({ id: agency.id, data: { subscriptionStatus: value as SubscriptionStatus } })
                }
              >
                <SelectTrigger aria-label={`${agency.name} subscription`}><SelectValue /></SelectTrigger>
                <SelectContent>{subscriptionStatuses.map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">AI generations remaining</span>
            <Input type="number" min={0} value={quota} onChange={(event) => setQuota(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Business limit</span>
            <Input type="number" min={1} value={businessesLimit} onChange={(event) => setBusinessesLimit(event.target.value)} />
          </label>
          <Button className="self-end" variant="outline" onClick={saveLimits} disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save limits
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Owner access</p>
            {agency.pendingInvitation ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Link for {agency.pendingInvitation.email} expires {formatDate(agency.pendingInvitation.expiresAt)}.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Create a new link when the owner needs access.</p>
            )}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="owner@agency.com"
                aria-label={`${agency.name} owner email`}
              />
              <Button
                variant="outline"
                disabled={!inviteEmail || createInvite.isPending}
                onClick={() => createInvite.mutate({ id: agency.id, data: { email: inviteEmail, expiresInDays: 14 } })}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {agency.pendingInvitation ? "Regenerate link" : "Generate link"}
              </Button>
            </div>
          </div>
          {agency.pendingInvitation && (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={revokeInvite.isPending}
              onClick={() => revokeInvite.mutate({ id: agency.pendingInvitation!.id })}
            >
              <X className="mr-2 h-4 w-4" /> Revoke
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {agency.pendingInvitation ? "An active link exists for this agency." : "No active signup link"}
          </span>
          <Button
            size="sm"
            variant={agency.status === "ACTIVE" ? "outline" : "default"}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: agency.id, data: { status: agency.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } })}
          >
            {agency.status === "ACTIVE" ? "Suspend agency" : "Reactivate agency"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPortal() {
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"agencies" | "businesses" | "deactivation">("agencies");
  const [createOpen, setCreateOpen] = useState(false);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [newAgency, setNewAgency] = useState({
    name: "",
    email: "",
    plan: "STARTER" as OrganizationPlan,
    subscriptionStatus: "TRIALING" as SubscriptionStatus,
    aiQuota: "50",
    businessesLimit: "1",
  });

  const { data: session, isLoading: sessionLoading } = useGetCurrentUser({
    query: { enabled: !!isSignedIn, queryKey: getGetCurrentUserQueryKey() },
  });
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";
  const { data, isLoading } = useGetAdminPortal({
    query: { enabled: !!isSignedIn && isSuperAdmin, queryKey: getGetAdminPortalQueryKey() },
  });
  const { data: deactivationData, isLoading: deactivationLoading, refetch: refetchDeactivation } =
    useListAdminDeactivationRequests({
      query: {
        enabled: !!isSignedIn && isSuperAdmin,
        queryKey: getListAdminDeactivationRequestsQueryKey(),
      },
    });
  const createAgency = useCreateAdminAgency({
    mutation: {
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: getGetAdminPortalQueryKey() });
        setLatestLink(result.invitation.signupPath);
        setCreateOpen(false);
        setNewAgency({ name: "", email: "", plan: "STARTER", subscriptionStatus: "TRIALING", aiQuota: "50", businessesLimit: "1" });
        toast({ title: "Agency created", description: "Copy the signup link and send it to the agency owner." });
      },
      onError: (error) =>
        toast({
          title: "Couldn't create agency",
          description: error instanceof Error ? error.message : "Please check the details and try again.",
          variant: "destructive",
        }),
    },
  });

  const filteredAgencies = useMemo(
    () =>
      (data?.agencies ?? []).filter((agency) =>
        `${agency.name} ${agency.slug} ${agency.owner?.email ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [data?.agencies, search],
  );
  const filteredBusinesses = useMemo(
    () =>
      (data?.businesses ?? []).filter((business) =>
        `${business.name} ${business.organizationName} ${business.category}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [data?.businesses, search],
  );
  const metrics: Array<[string, number, LucideIcon]> = [
    ["Agencies", data?.overview.totalOrganizations ?? 0, Building2],
    ["Owners", data?.overview.totalOwners ?? 0, Users],
    ["Businesses", data?.overview.totalBusinesses ?? 0, Building2],
    ["Pending links", data?.overview.pendingInvitations ?? 0, Link2],
    ["Suspended", data?.overview.totalSuspendedOrganizations ?? 0, ShieldCheck],
    ["Deactivation requests", deactivationData?.pendingCount ?? 0, ClipboardCheck],
  ];

  if (!isLoaded || sessionLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (!isSuperAdmin) return <Redirect to="/businesses" />;

  return (
    <AppLayout title="Master Admin">
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-4 w-4" /> Platform control
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Master admin</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
              Manage agencies, access links, and every business on your platform.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Onboard agency</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map(([label, value, Icon]) => (
            <Card key={String(label)} className="border-border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4" /></div>
                <p className="mt-2 text-3xl font-bold text-foreground">{isLoading ? "—" : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <Button size="sm" variant={view === "agencies" ? "secondary" : "ghost"} onClick={() => setView("agencies")}>Agencies</Button>
             <Button size="sm" variant={view === "businesses" ? "secondary" : "ghost"} onClick={() => setView("businesses")}>All businesses</Button>
             <Button size="sm" variant={view === "deactivation" ? "secondary" : "ghost"} onClick={() => setView("deactivation")}>
               Review requests
               {(deactivationData?.pendingCount ?? 0) > 0 && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-xs text-amber-700 dark:text-amber-300">{deactivationData?.pendingCount}</span>}
             </Button>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "agencies" ? "Search agencies or owners…" : "Search businesses or agencies…"} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : view === "agencies" ? (
          filteredAgencies.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No agencies match your search.</CardContent></Card>
          ) : (
            <div className="space-y-4">{filteredAgencies.map((agency) => <AgencyCard key={agency.id} agency={agency} onLinkCreated={setLatestLink} />)}</div>
          )
        ) : view === "businesses" ? (
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredBusinesses.map((business) => (
                  <div key={business.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="font-medium text-foreground">{business.name}</p><p className="text-sm text-muted-foreground">{business.category} · {business.organizationName}</p></div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground"><Badge variant="outline">{business.status}</Badge><span>Added {formatDate(business.createdAt)}</span></div>
                  </div>
                ))}
                {filteredBusinesses.length === 0 && <p className="p-12 text-center text-sm text-muted-foreground">No businesses match your search.</p>}
              </div>
            </CardContent>
          </Card>
        ) : (
          <DeactivationQueue
            requests={deactivationData?.requests ?? []}
            isLoading={deactivationLoading}
            onReviewed={() => void refetchDeactivation()}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboard an agency</DialogTitle>
            <DialogDescription>Create the agency workspace and generate its first secure signup link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Agency name</span><Input value={newAgency.name} onChange={(event) => setNewAgency({ ...newAgency, name: event.target.value })} placeholder="Northstar Digital" /></label>
            <label className="block space-y-1.5 text-sm"><span className="font-medium">Owner email</span><Input type="email" value={newAgency.email} onChange={(event) => setNewAgency({ ...newAgency, email: event.target.value })} placeholder="owner@agency.com" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm"><span className="font-medium">Plan</span><Select value={newAgency.plan} onValueChange={(value) => setNewAgency({ ...newAgency, plan: value as OrganizationPlan })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{plans.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Subscription</span><Select value={newAgency.subscriptionStatus} onValueChange={(value) => setNewAgency({ ...newAgency, subscriptionStatus: value as SubscriptionStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{subscriptionStatuses.map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">AI generations</span><Input type="number" min={0} value={newAgency.aiQuota} onChange={(event) => setNewAgency({ ...newAgency, aiQuota: event.target.value })} /></label>
              <label className="space-y-1.5 text-sm"><span className="font-medium">Business limit</span><Input type="number" min={1} value={newAgency.businessesLimit} onChange={(event) => setNewAgency({ ...newAgency, businessesLimit: event.target.value })} /></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!newAgency.name.trim() || !newAgency.email.trim() || createAgency.isPending} onClick={() => createAgency.mutate({ data: { name: newAgency.name.trim(), email: newAgency.email.trim(), plan: newAgency.plan, subscriptionStatus: newAgency.subscriptionStatus, aiQuota: Number(newAgency.aiQuota) || 0, businessesLimit: Math.max(1, Number(newAgency.businessesLimit) || 1), expiresInDays: 14 } })}>
              {createAgency.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create agency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!latestLink} onOpenChange={(open) => !open && setLatestLink(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signup link ready</DialogTitle><DialogDescription>This link expires in 14 days and can be used once by the invited owner.</DialogDescription></DialogHeader>
          <div className="flex gap-2"><Input readOnly value={latestLink ? signupUrl(latestLink) : ""} /><Button onClick={() => { if (latestLink) void navigator.clipboard.writeText(signupUrl(latestLink)); toast({ title: "Link copied" }); }}><Copy className="mr-2 h-4 w-4" /> Copy</Button></div>
          <DialogFooter><Button onClick={() => setLatestLink(null)}><Check className="mr-2 h-4 w-4" /> Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}