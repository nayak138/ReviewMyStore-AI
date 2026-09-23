import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListBusinessTeamQueryKey,
  getListBusinessesQueryKey,
  useCreateTeamInvitation,
  useListBusinessTeam,
  useListBusinesses,
  useRemoveTeamMember,
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useUpdatePendingTeamInvitation,
  useUpdateTeamMember,
  type AnalyticsPermission,
  type TeamPermission,
  type TeamPermissionsInput,
} from "@workspace/api-client-react";
import {
  Check,
  CircleAlert,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TEAM_PERMISSION_FIELDS = [
  ["campaignsPermission", "Campaigns"],
  ["reviewInboxPermission", "Review Inbox"],
  ["feedbackPermission", "Feedback"],
  ["socialMediaPermission", "Social Media"],
] as const;

type PermissionField = (typeof TEAM_PERMISSION_FIELDS)[number][0];
type Grants = TeamPermissionsInput;

const EMPTY_GRANTS: Grants = {
  campaignsPermission: "NONE",
  reviewInboxPermission: "NONE",
  feedbackPermission: "NONE",
  socialMediaPermission: "NONE",
  analyticsPermission: "NONE",
};

function hasGrant(grants: Grants) {
  return Object.values(grants).some((value) => value !== "NONE");
}

function permissionLabel(value: TeamPermission | AnalyticsPermission) {
  return value === "MANAGE" ? "Manage" : value === "VIEW" ? "View" : "No access";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function PermissionEditor({
  grants,
  onChange,
  disabled,
}: {
  grants: Grants;
  onChange: (field: keyof Grants, value: TeamPermission | AnalyticsPermission) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TEAM_PERMISSION_FIELDS.map(([field, label]) => (
        <label key={field} className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Select
            value={grants[field]}
            disabled={disabled}
            onValueChange={(value) => onChange(field, value as TeamPermission)}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No access</SelectItem>
              <SelectItem value="VIEW">View only</SelectItem>
              <SelectItem value="MANAGE">Manage</SelectItem>
            </SelectContent>
          </Select>
        </label>
      ))}
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Analytics</span>
        <Select
          value={grants.analyticsPermission}
          disabled={disabled}
          onValueChange={(value) => onChange("analyticsPermission", value as AnalyticsPermission)}
        >
          <SelectTrigger className="h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">No access</SelectItem>
            <SelectItem value="VIEW">View only</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

function grantValues(item: {
  campaignsPermission: TeamPermission;
  reviewInboxPermission: TeamPermission;
  feedbackPermission: TeamPermission;
  socialMediaPermission: TeamPermission;
  analyticsPermission: AnalyticsPermission;
}): Grants {
  return {
    campaignsPermission: item.campaignsPermission,
    reviewInboxPermission: item.reviewInboxPermission,
    feedbackPermission: item.feedbackPermission,
    socialMediaPermission: item.socialMediaPermission,
    analyticsPermission: item.analyticsPermission,
  };
}

export function BusinessTeamsCard() {
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [email, setEmail] = useState("");
  const [invitedName, setInvitedName] = useState("");
  const [grants, setGrants] = useState<Grants>(EMPTY_GRANTS);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editingInvite, setEditingInvite] = useState<string | null>(null);
  const [editGrants, setEditGrants] = useState<Grants>(EMPTY_GRANTS);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const businessesQuery = useListBusinesses(
    { includeArchived: false },
    {
      query: {
        queryKey: getListBusinessesQueryKey({ includeArchived: false }),
        refetchOnMount: "always",
      },
    },
  );
  const businesses = businessesQuery.data?.businesses ?? [];
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);

  useEffect(() => {
    if (!selectedBusinessId && businesses[0]) setSelectedBusinessId(businesses[0].id);
    if (selectedBusinessId && !businesses.some((business) => business.id === selectedBusinessId)) {
      setSelectedBusinessId(businesses[0]?.id ?? "");
    }
  }, [businesses, selectedBusinessId]);

  const teamQuery = useListBusinessTeam(
    { businessId: selectedBusinessId },
    {
      query: {
        enabled: !!selectedBusinessId,
        queryKey: getListBusinessTeamQueryKey({ businessId: selectedBusinessId }),
        refetchOnMount: "always",
      },
    },
  );
  const team = teamQuery.data;
  const refresh = () => {
    if (selectedBusinessId) {
      void queryClient.invalidateQueries({
        queryKey: getListBusinessTeamQueryKey({ businessId: selectedBusinessId }),
      });
    }
  };

  const createInvitation = useCreateTeamInvitation({
    mutation: {
      onSuccess: (result) => {
        refresh();
        setEmail("");
        setInvitedName("");
        setGrants(EMPTY_GRANTS);
        setMessage(
          result.delivery.sent
            ? { tone: "success", text: `Invitation sent to ${result.invitation.email}.` }
            : {
                tone: "error",
                text: `Invitation created, but email delivery failed. Use Resend below to try again.`,
              },
        );
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "The invitation could not be created.") }),
    },
  });
  const updateMember = useUpdateTeamMember({
    mutation: {
      onSuccess: () => {
        refresh();
        setEditingMember(null);
        setMessage({ tone: "success", text: "Member permissions updated." });
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "Member permissions could not be updated.") }),
    },
  });
  const updateInvite = useUpdatePendingTeamInvitation({
    mutation: {
      onSuccess: () => {
        refresh();
        setEditingInvite(null);
        setMessage({ tone: "success", text: "Pending invitation permissions updated." });
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "Pending invitation could not be updated.") }),
    },
  });
  const resendInvite = useResendTeamInvitation({
    mutation: {
      onSuccess: (result) => {
        refresh();
        setMessage(
          result.delivery.sent
            ? { tone: "success", text: `A fresh invitation was sent to ${result.invitation.email}.` }
            : { tone: "error", text: "The invitation link was rotated, but email delivery failed. Try again." },
        );
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "The invitation could not be resent.") }),
    },
  });
  const revokeInvite = useRevokeTeamInvitation({
    mutation: {
      onSuccess: () => {
        refresh();
        setMessage({ tone: "success", text: "Pending invitation revoked." });
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "The invitation could not be revoked.") }),
    },
  });
  const removeMember = useRemoveTeamMember({
    mutation: {
      onSuccess: () => {
        refresh();
        setConfirmRemove(null);
        setMessage({ tone: "success", text: "Business access removed." });
      },
      onError: (error) =>
        setMessage({ tone: "error", text: errorMessage(error, "Business access could not be removed.") }),
    },
  });

  const canInvite = !!email.trim() && hasGrant(grants) && !!selectedBusinessId;
  const isBusy =
    createInvitation.isPending ||
    updateMember.isPending ||
    updateInvite.isPending ||
    resendInvite.isPending ||
    revokeInvite.isPending ||
    removeMember.isPending;
  const seatsLabel = team ? `${team.seatsUsed}/${team.seatLimit} teammate seats reserved` : "Loading seat availability…";

  const submitInvitation = () => {
    setMessage(null);
    if (!email.trim()) {
      setMessage({ tone: "error", text: "Enter an email address to invite." });
      return;
    }
    if (!hasGrant(grants)) {
      setMessage({ tone: "error", text: "Select at least one feature permission." });
      return;
    }
    createInvitation.mutate({
      data: {
        businessId: selectedBusinessId,
        email: email.trim(),
        invitedName: invitedName.trim() || undefined,
        ...grants,
      },
    });
  };

  const accessSummary = useMemo(
    () =>
      (item: {
        campaignsPermission: TeamPermission;
        reviewInboxPermission: TeamPermission;
        feedbackPermission: TeamPermission;
        socialMediaPermission: TeamPermission;
        analyticsPermission: AnalyticsPermission;
      }) => {
        const values = [
          ["Campaigns", item.campaignsPermission],
          ["Reviews", item.reviewInboxPermission],
          ["Feedback", item.feedbackPermission],
          ["Social", item.socialMediaPermission],
          ["Analytics", item.analyticsPermission],
        ] as const;
        return values
          .filter(([, value]) => value !== "NONE")
          .map(([label, value]) => `${label}: ${permissionLabel(value)}`)
          .join(" · ");
      },
    [],
  );

  return (
    <section className="lg:col-span-2" data-testid="settings-teams-section">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b border-border/80 bg-secondary/30 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Business teams</CardTitle>
                <CardDescription className="mt-1">
                  Invite teammates to specific businesses with the minimum access they need.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="w-fit shrink-0 gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Owner only
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {businessesQuery.isLoading ? (
            <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
              Loading your businesses…
            </div>
          ) : businessesQuery.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <span className="flex items-center gap-2 text-destructive">
                <CircleAlert className="h-4 w-4" aria-hidden="true" /> Businesses could not load.
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => void businessesQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Create a business before inviting teammates.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="min-w-0 flex-1 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Business</span>
                  <Select value={selectedBusinessId} onValueChange={(value) => { setSelectedBusinessId(value); setMessage(null); }}>
                    <SelectTrigger className="bg-background" data-testid="teams-business-selector">
                      <SelectValue placeholder="Choose a business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary" data-testid="teams-seat-counter">
                  {seatsLabel}
                </div>
              </div>

              {message && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-3 text-sm",
                    message.tone === "success"
                      ? "border-success/20 bg-success/5 text-success"
                      : "border-destructive/20 bg-destructive/5 text-destructive",
                  )}
                  role={message.tone === "error" ? "alert" : "status"}
                  data-testid="teams-status-message"
                >
                  {message.tone === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-4 rounded-xl border border-border/80 p-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                    <div>
                      <h4 className="text-sm font-semibold">Invite a teammate</h4>
                      <p className="text-xs text-muted-foreground">They’ll receive a secure 14-day join link.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" aria-label="Teammate email" data-testid="teams-invite-email" />
                    <Input value={invitedName} onChange={(event) => setInvitedName(event.target.value)} placeholder="Name (optional)" aria-label="Teammate name" data-testid="teams-invite-name" />
                    <PermissionEditor grants={grants} onChange={(field, value) => setGrants((current) => ({ ...current, [field]: value }))} disabled={isBusy} />
                    <Button type="button" className="w-full" onClick={submitInvitation} disabled={!canInvite || isBusy} data-testid="teams-invite-submit">
                      {createInvitation.isPending ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="mr-2 h-4 w-4" aria-hidden="true" />}
                      {createInvitation.isPending ? "Sending invitation…" : "Invite teammate"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold">Active members</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Permissions take effect on the next request.</p>
                  </div>
                  {teamQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading team members…</p>
                  ) : teamQuery.isError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Team details could not load. Refresh to try again.</div>
                  ) : team?.members.length ? (
                    <div className="space-y-3">
                      {team.members.map((member) => (
                        <div key={member.id} className="rounded-xl border border-border/80 p-3.5" data-testid={`team-member-${member.id}`}>
                          {editingMember === member.id ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold">{member.name} <span className="font-normal text-muted-foreground">({member.email})</span></p>
                              <PermissionEditor grants={editGrants} onChange={(field, value) => setEditGrants((current) => ({ ...current, [field]: value }))} disabled={updateMember.isPending} />
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingMember(null)}>Cancel</Button>
                                <Button type="button" size="sm" onClick={() => updateMember.mutate({ id: member.id, data: editGrants })} disabled={!hasGrant(editGrants) || updateMember.isPending}>Save permissions</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{member.name}</p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">{member.email}</p>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">{accessSummary(member) || "No feature access"}</p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => { setEditingMember(member.id); setEditGrants(grantValues(member)); }}>Edit access</Button>
                                <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Remove ${member.name}`} onClick={() => setConfirmRemove(member.id)}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {confirmRemove === member.id && (
                            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-destructive">Remove this teammate’s access to {selectedBusiness?.name}?</span>
                              <span className="flex gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => removeMember.mutate({ id: member.id })} disabled={removeMember.isPending}>Remove</Button>
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No teammates have joined this business yet.</p>
                  )}

                  <div className="border-t border-border/80 pt-5">
                    <h4 className="text-sm font-semibold">Pending invitations</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Pending invitations reserve a seat until they expire or are revoked.</p>
                    <div className="mt-3 space-y-3">
                      {team?.invitations.length ? team.invitations.map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-border/80 p-3.5" data-testid={`team-invitation-${invite.id}`}>
                          {editingInvite === invite.id ? (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold">{invite.email}</p>
                              <PermissionEditor grants={editGrants} onChange={(field, value) => setEditGrants((current) => ({ ...current, [field]: value }))} disabled={updateInvite.isPending} />
                              <div className="flex justify-end gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInvite(null)}>Cancel</Button>
                                <Button type="button" size="sm" onClick={() => updateInvite.mutate({ id: invite.id, data: editGrants })} disabled={!hasGrant(editGrants) || updateInvite.isPending}>Save permissions</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{invite.email}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                                <p className={cn("mt-1 text-xs", invite.deliveryStatus === "SENT" ? "text-success" : "text-destructive")}>
                                  {invite.deliveryStatus === "SENT" ? "Email submitted" : "Email delivery failed — resend to retry"}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{accessSummary(invite) || "No feature access"}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => { setEditingInvite(invite.id); setEditGrants(grantValues(invite)); }}>Edit</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => resendInvite.mutate({ id: invite.id })} disabled={isBusy}>Resend</Button>
                                <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => revokeInvite.mutate({ id: invite.id })} disabled={isBusy}>Revoke</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )) : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No pending invitations.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </section>
  );
}