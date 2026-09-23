import { useAuth, useClerk, useUser } from "@clerk/react";
import {
  getGetCurrentUserQueryKey,
  getGetEmailPreferencesQueryKey,
  useGetCurrentUser,
  useGetEmailPreferences,
  useRequestAccountDataExport,
  useRequestAccountDeactivation,
  useUpdateEmailPreferences,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Database,
  Download,
  Info,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { BusinessTeamsCard } from "@/components/teams/business-teams-card";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function downloadAccountExport(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `5-star-ai-account-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SectionIcon({
  icon: Icon,
  tone = "primary",
}: {
  icon: typeof UserRound;
  tone?: "primary" | "accent" | "success";
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "accent" && "bg-accent/20 text-accent-foreground",
        tone === "success" && "bg-success/10 text-success",
      )}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  testId,
  children,
}: {
  icon: typeof Mail;
  label: string;
  value?: string;
  testId?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-border/80 py-4 first:border-t-0 first:pt-0 last:pb-0" data-testid={testId}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {value && <p className="mt-1 text-sm text-muted-foreground">{value}</p>}
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  const [deactivationOpen, setDeactivationOpen] = useState(false);
  const [deactivationConfirmation, setDeactivationConfirmation] = useState("");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportExpiresAt, setExportExpiresAt] = useState<string | null>(null);
  const [deactivationMessage, setDeactivationMessage] = useState<string | null>(null);
  const accountDataExport = useRequestAccountDataExport();
  const accountDeactivation = useRequestAccountDeactivation();
  const { data: session, isLoading, isError, refetch } = useGetCurrentUser({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  const account = session?.user;
  const accountName = clerkUser?.fullName || account?.name || "Account owner";
  const accountEmail =
    clerkUser?.primaryEmailAddress?.emailAddress || account?.email || "Email unavailable";
  const emailIsVerified = clerkUser?.primaryEmailAddress?.verification?.status === "verified";
  const isActive = account?.status === "ACTIVE";

  const handleAccountExport = () => {
    setExportMessage(null);
    setExportExpiresAt(null);
    accountDataExport.mutate(undefined, {
      onSuccess: (data) => {
        downloadAccountExport(data);
        setExportExpiresAt(new Date(data.expiresAt).toLocaleString());
        setExportMessage("Your account-only export was downloaded and recorded.");
      },
      onError: (error) => {
        setExportMessage(
          getErrorMessage(error, "The export could not be created. Please try again."),
        );
      },
    });
  };

  const handleDeactivationRequest = () => {
    if (deactivationConfirmation !== "DEACTIVATE") return;
    setDeactivationMessage(null);
    accountDeactivation.mutate(
      { data: { confirmation: "DEACTIVATE" } },
      {
        onSuccess: (data) => {
          setDeactivationOpen(false);
          setDeactivationConfirmation("");
          setDeactivationMessage(data.message);
        },
        onError: (error) => {
          setDeactivationMessage(
            getErrorMessage(
              error,
              "The deactivation request could not be submitted. Please try again.",
            ),
          );
        },
      },
    );
  };

  return (
    <AppLayout title="Account settings">
      <div className="review-noise min-h-full">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6 md:px-8 md:py-10">
          {isLoading ? (
            <SettingsSkeleton />
          ) : isError ? (
            <Card className="border-destructive/30 bg-card shadow-sm" data-testid="settings-error-state">
              <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                    <CircleAlert className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Account details could not load</p>
                    <p className="mt-1 text-sm text-muted-foreground">Refresh the account record to try again.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refetch()}
                  data-testid="settings-retry-button"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
                <Card className="overflow-hidden border-border shadow-sm" data-testid="settings-profile-card">
                  <CardHeader className="border-b border-border/80 bg-secondary/30 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <SectionIcon icon={UserRound} />
                        <div>
                          <CardTitle>Account profile</CardTitle>
                          <CardDescription className="mt-1">The identity attached to your 5-Star.AI login.</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                        Personal account
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-foreground" data-testid="settings-profile-name">
                            {accountName}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground" data-testid="settings-profile-email">
                            {accountEmail}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => openUserProfile()}
                        data-testid="settings-manage-profile-button"
                      >
                        Manage profile
                        <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/80 pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5" data-testid="settings-profile-role">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                        {account?.role === "SUPER_ADMIN" ? "Platform administrator" : "Account owner"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Sign-in managed by Clerk
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm" data-testid="settings-account-status-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={Check} tone="success" />
                      <div>
                        <CardTitle>Account status</CardTitle>
                        <CardDescription className="mt-1">Your access to 5-Star.AI.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-6 pb-6">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-success/5 px-3.5 py-3" data-testid="settings-account-status">
                      <span className="text-sm font-medium text-foreground">{isActive ? "Active" : "Access paused"}</span>
                      <Badge variant={isActive ? "success" : "destructive"}>
                        {isActive ? "In good standing" : "Review needed"}
                      </Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Account created</span>
                        <span className="text-right font-medium text-foreground" data-testid="settings-account-created">
                          {formatDate(account?.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Last sign-in</span>
                        <span className="text-right font-medium text-foreground" data-testid="settings-last-sign-in">
                          {formatDate(account?.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {account?.role === "OWNER" && <BusinessTeamsCard />}
                <Card className="border-border shadow-sm" data-testid="settings-security-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={LockKeyhole} tone="accent" />
                      <div>
                        <CardTitle>Sign-in and security</CardTitle>
                        <CardDescription className="mt-1">Authentication controls stay with your identity provider.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    <DetailRow
                      icon={ShieldCheck}
                      label="Authentication provider"
                      value="Clerk securely manages your sign-in."
                      testId="settings-security-provider-row"
                    />
                    <DetailRow
                      icon={Mail}
                      label="Account email"
                      testId="settings-security-email-row"
                    >
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">{accountEmail}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            emailIsVerified
                              ? "border-success/30 bg-success/5 text-success"
                              : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
                          )}
                          data-testid="settings-security-email-status"
                        >
                          {emailIsVerified ? (
                            <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Info className="mr-1 h-3 w-3" aria-hidden="true" />
                          )}
                          {emailIsVerified ? "Verified" : "Verification status unavailable"}
                        </Badge>
                      </div>
                    </DetailRow>
                    <div className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Need to update sign-in details?</p>
                      <p className="mt-1 leading-5">Use Clerk&apos;s profile panel so changes remain protected by your sign-in provider.</p>
                      <Button
                        type="button"
                        variant="link"
                        className="mt-2 h-auto px-0 py-0"
                        onClick={() => openUserProfile()}
                        data-testid="settings-security-profile-button"
                      >
                        Open profile and security
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm" data-testid="settings-communications-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={Mail} />
                      <div>
                        <CardTitle>Account communications</CardTitle>
                        <CardDescription className="mt-1">A clear view of what this account center supports.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <EmailPreferencesCard />
                </Card>

                <Card className="border-border shadow-sm lg:col-span-2" data-testid="settings-privacy-card">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <SectionIcon icon={Database} tone="success" />
                      <div>
                        <CardTitle>Privacy and data</CardTitle>
                        <CardDescription className="mt-1">Understand the account-level data actions available here.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2">
                    <DetailRow
                      icon={Download}
                      label="Download account data"
                      value="Get a JSON copy of your account profile and access record. Each export is audit logged and expires after 15 minutes."
                      testId="settings-privacy-data-status"
                    />
                    <div className="flex flex-col items-start justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAccountExport}
                        disabled={accountDataExport.isPending}
                        data-testid="settings-export-button"
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        {accountDataExport.isPending ? "Preparing export..." : "Download export"}
                      </Button>
                      {exportMessage && (
                        <p
                          className={cn(
                            "text-sm",
                            accountDataExport.isError ? "text-destructive" : "text-success",
                          )}
                          role={accountDataExport.isError ? "alert" : "status"}
                          data-testid="settings-export-message"
                        >
                          {exportMessage}
                        </p>
                      )}
                      {exportExpiresAt && !accountDataExport.isError && (
                        <p className="text-xs text-muted-foreground" data-testid="settings-export-expiry">
                          Export retention window ends {exportExpiresAt}.
                        </p>
                      )}
                    </div>
                    <DetailRow
                      icon={TriangleAlert}
                      label="Request account deactivation"
                      value="This starts a review. It does not immediately sign you out or delete business and workspace data."
                      testId="settings-deactivation-status"
                    />
                    <div className="flex flex-col items-start justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setDeactivationMessage(null);
                          setDeactivationConfirmation("");
                          setDeactivationOpen(true);
                        }}
                        disabled={accountDeactivation.isPending}
                        data-testid="settings-deactivation-button"
                      >
                        Request deactivation
                      </Button>
                      {deactivationMessage && (
                        <p
                          className={cn(
                            "text-sm",
                            accountDeactivation.isError ? "text-destructive" : "text-success",
                          )}
                          role={accountDeactivation.isError ? "alert" : "status"}
                          data-testid="settings-deactivation-message"
                        >
                          {deactivationMessage}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={deactivationOpen}
        onOpenChange={(open) => {
          if (!accountDeactivation.isPending) setDeactivationOpen(open);
        }}
      >
        <DialogContent data-testid="settings-deactivation-dialog">
          <DialogHeader>
            <DialogTitle>Request account deactivation?</DialogTitle>
            <DialogDescription>
              We will review this request before taking action. Your current session remains active,
              and this request does not delete or change business, workspace, team, connection,
              campaign, or review data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="deactivation-confirmation" className="text-sm font-medium text-foreground">
              Type DEACTIVATE to confirm
            </label>
            <Input
              id="deactivation-confirmation"
              value={deactivationConfirmation}
              onChange={(event) => setDeactivationConfirmation(event.target.value)}
              placeholder="DEACTIVATE"
              autoComplete="off"
              data-testid="input-deactivation-confirmation"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivationOpen(false)}
              disabled={accountDeactivation.isPending}
              data-testid="button-cancel-deactivation"
            >
              Keep account
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivationRequest}
              disabled={
                deactivationConfirmation !== "DEACTIVATE" || accountDeactivation.isPending
              }
              data-testid="button-confirm-deactivation"
            >
              {accountDeactivation.isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function EmailPreferencesCard() {
  const queryClient = useQueryClient();
  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useGetEmailPreferences({
    query: {
      queryKey: getGetEmailPreferencesQueryKey(),
    },
  });
  const updatePreferences = useUpdateEmailPreferences({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetEmailPreferencesQueryKey(), updated);
      },
    },
  });

  const handleChange = (
    key: "productUpdates" | "releaseAnnouncements",
    value: boolean,
  ) => {
    updatePreferences.mutate({
      data: {
        [key]: value,
      },
    });
  };

  return (
    <CardContent className="space-y-4" data-testid="settings-communications-content">
      <p className="text-sm leading-5 text-muted-foreground">
        Choose which optional emails you receive from 5-Star.AI. These settings apply to your account on every device.
      </p>

      {isLoading ? (
        <div className="space-y-3" data-testid="settings-email-preferences-loading">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : isError || !preferences ? (
        <div
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm"
          data-testid="settings-email-preferences-error"
        >
          <div className="flex items-start gap-2.5">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">Email preferences could not load</p>
              <p className="mt-1 text-muted-foreground">Refresh to try again.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            data-testid="settings-email-preferences-retry"
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2" data-testid="settings-email-preferences-controls">
            <PreferenceSwitch
              checked={preferences.productUpdates}
              disabled={updatePreferences.isPending}
              label="Product updates"
              description="Tips, improvements, and occasional updates about 5-Star.AI."
              onCheckedChange={(value) => handleChange("productUpdates", value)}
              testId="settings-product-updates-switch"
            />
            <PreferenceSwitch
              checked={preferences.releaseAnnouncements}
              disabled={updatePreferences.isPending}
              label="Release announcements"
              description="News about major features and product releases."
              onCheckedChange={(value) => handleChange("releaseAnnouncements", value)}
              testId="settings-release-announcements-switch"
            />
            <PreferenceSwitch
              checked
              disabled
              label="Security and account-service messages"
              description="Required messages about sign-in, account access, and service changes."
              onCheckedChange={() => undefined}
              testId="settings-required-messages-switch"
            />
          </div>
          <div className="flex min-h-5 items-center gap-2 text-xs" aria-live="polite">
            {updatePreferences.isPending ? (
              <>
                <RefreshCcw className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                <span className="text-muted-foreground" data-testid="settings-email-preferences-saving">
                  Saving…
                </span>
              </>
            ) : updatePreferences.isError ? (
              <>
                <CircleAlert className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                <span className="text-destructive" data-testid="settings-email-preferences-save-error">
                  Could not save this preference. Try again.
                </span>
              </>
            ) : updatePreferences.isSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                <span className="text-success" data-testid="settings-email-preferences-saved">
                  Preferences saved.
                </span>
              </>
            ) : null}
          </div>
        </>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Required security and account-service messages are always enabled.
      </p>
    </CardContent>
  );
}

function PreferenceSwitch({
  checked,
  disabled,
  label,
  description,
  onCheckedChange,
  testId,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onCheckedChange: (value: boolean) => void;
  testId: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-secondary/30 px-3.5 py-3"
      data-testid={`${testId}-row`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        data-testid={testId}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6" data-testid="settings-loading-state">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-56 max-w-[60vw]" />
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-border pt-5">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-52 max-w-[55vw]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-5 p-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="space-y-4 p-6"><Skeleton className="h-6 w-52" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
        <Card><CardContent className="space-y-4 p-6"><Skeleton className="h-6 w-48" /><Skeleton className="h-16 w-full" /><Skeleton className="h-10 w-3/4" /></CardContent></Card>
      </div>
    </div>
  );
}