import { useAuth } from "@clerk/react";
import {
  getGetPublicTeamInvitationQueryKey,
  useAcceptTeamInvitation,
  useGetPublicTeamInvitation,
} from "@workspace/api-client-react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { BrandIcon } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  clearTeamInvitationToken,
  resolveTeamInvitationToken,
} from "@/auth/team-invitation-token";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <BrandIcon className="mx-auto h-12 w-12 rounded-xl" />
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
          Team invitation unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <Link href={`${basePath}/sign-in`}>
          <Button className="mt-6">Go to sign in</Button>
        </Link>
      </div>
    </div>
  );
}

export default function TeamJoin() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, params] = useRoute("/team/join/:token");
  const [, setLocation] = useLocation();
  const token = params?.token ?? "";
  const preview = useGetPublicTeamInvitation(token, {
    query: {
      enabled: !!token,
      queryKey: getGetPublicTeamInvitationQueryKey(token),
    },
  });
  const accept = useAcceptTeamInvitation();

  if (!token) return <ErrorCard message="This invitation link is missing its token." />;
  if (!preview.isLoading && !preview.data) {
    return (
      <ErrorCard message="This link is invalid, expired, revoked, or the business is no longer available. Ask the business owner for a new invitation." />
    );
  }
  if (!isLoaded || preview.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const invitation = preview.data;
  if (!invitation) return <ErrorCard message="Invitation unavailable." />;

  const join = () => {
    if (!isSignedIn) {
      window.sessionStorage.setItem("reviewmystore.teamInvitationToken", token);
      const redirect = `${basePath}/team/join/${encodeURIComponent(token)}`;
      setLocation(
        `${basePath}/sign-up?teamInvite=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent(redirect)}`,
      );
      return;
    }
    accept.mutate(
      { data: { token } },
      {
        onSuccess: () => {
          clearTeamInvitationToken(window.sessionStorage);
          setLocation("/businesses");
        },
      },
    );
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          <BrandIcon className="h-9 w-9 rounded-lg" />
          <span className="font-display text-lg font-semibold tracking-tight">
            5-Star.AI
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Business team invitation
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Join {invitation.businessName}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {invitation.organizationName} invited you to collaborate. Sign in
            or create an account using the invited email address.
          </p>
          <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Invited email
              </p>
              <p className="mt-1 font-medium text-foreground">{invitation.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Access
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  invitation.campaignsPermission !== "NONE" && "Campaigns",
                  invitation.reviewInboxPermission !== "NONE" && "Review Inbox",
                  invitation.feedbackPermission !== "NONE" && "Feedback",
                  invitation.socialMediaPermission !== "NONE" && "Social Media",
                  invitation.analyticsPermission !== "NONE" && "Analytics",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>
          {accept.isError && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {accept.error instanceof Error
                ? accept.error.message
                : "We could not accept this invitation. Sign in with the invited email and try again."}
            </p>
          )}
          <Button
            className="mt-7 w-full"
            size="lg"
            onClick={join}
            disabled={accept.isPending}
          >
            {accept.isPending
              ? "Joining team..."
              : isSignedIn
                ? "Join your team"
                : "Create your team account"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This link expires {new Date(invitation.expiresAt).toLocaleDateString()} and can be used once.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TeamAccept() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const token = resolveTeamInvitationToken(
    window.location.search,
    window.sessionStorage,
  );
  const accept = useAcceptTeamInvitation({
    mutation: {
      onSuccess: () => {
        clearTeamInvitationToken(window.sessionStorage);
        setLocation("/businesses");
      },
    },
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && token && !accept.isPending && !accept.isSuccess && !accept.isError) {
      accept.mutate({ data: { token } });
    }
  }, [accept, isLoaded, isSignedIn, token]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!token) return <ErrorCard message="Your team invitation could not be resumed. Ask the owner for a new link." />;
  if (accept.isError) {
    return <ErrorCard message={accept.error instanceof Error ? accept.error.message : "This invitation could not be accepted. Sign in with the invited email and try again."} />;
  }
  return <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}