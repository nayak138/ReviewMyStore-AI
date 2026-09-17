import { useAuth, useClerk, useUser } from "@clerk/react";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Database,
  Info,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
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

  return (
    <AppLayout title="Account settings">
      <div className="review-noise min-h-full">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6 md:px-8 md:py-10">
          <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8" data-testid="settings-page">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="relative max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Account center
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Settings
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                A calm place to review the identity you use with 5-Star.AI, see how sign-in is protected, and understand what is available for your account today.
              </p>
            </div>
          </header>

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
                      <div className="flex min-w-0 items-center gap-4">
                        {clerkUser?.imageUrl ? (
                          <img
                            src={clerkUser.imageUrl}
                            alt={`${accountName} profile`}
                            className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm"
                            data-testid="settings-profile-avatar"
                          />
                        ) : (
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm"
                            aria-hidden="true"
                            data-testid="settings-profile-avatar"
                          >
                            {initials(accountName)}
                          </div>
                        )}
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
                  <CardContent>
                    <DetailRow
                      icon={Mail}
                      label="Product and account email preferences"
                      testId="settings-communications-status"
                    >
                      <div className="mt-2 flex items-start gap-2.5 rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-muted-foreground">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>Email preference controls are not available in this account center yet.</span>
                      </div>
                    </DetailRow>
                    <p className="mt-5 text-xs leading-5 text-muted-foreground">
                      Required account messages may still be sent to the email address on file.
                    </p>
                  </CardContent>
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
                  <CardContent className="grid gap-5 sm:grid-cols-2">
                    <DetailRow
                      icon={Database}
                      label="Account data requests"
                      testId="settings-privacy-data-status"
                    >
                      <div className="mt-2 flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>Export and deletion requests are not supported from this screen.</span>
                      </div>
                    </DetailRow>
                    <DetailRow
                      icon={Clock3}
                      label="Data controls"
                      value="No additional privacy controls are configured for this account center."
                      testId="settings-privacy-controls-status"
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
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