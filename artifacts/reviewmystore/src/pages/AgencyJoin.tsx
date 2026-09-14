import { useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useGetPublicAgencyInvitation, getGetPublicAgencyInvitationQueryKey } from "@workspace/api-client-react";
import { BrandIcon } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AgencyJoin() {
  const [, params] = useRoute("/agency/join/:token");
  const [, setLocation] = useLocation();
  const token = params?.token ?? "";
  const { data: invitation, isLoading, isError } = useGetPublicAgencyInvitation(token, {
    query: {
      enabled: !!token,
      queryKey: getGetPublicAgencyInvitationQueryKey(token),
    },
  });

  useEffect(() => {
    if (isError) {
      document.title = "Invitation unavailable | 5-Star.AI";
    }
  }, [isError]);

  if (isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!invitation) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <BrandIcon className="mx-auto h-12 w-12 rounded-xl" />
          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">Invitation unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This signup link is invalid, expired, or has already been used. Ask your platform administrator for a new link.</p>
          <Link href={`${basePath}/sign-in`}><Button className="mt-6">Go to agency login</Button></Link>
        </div>
      </div>
    );
  }

  const signUpPath = `${basePath}/sign-up?invite=${encodeURIComponent(token)}`;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2"><BrandIcon className="h-9 w-9 rounded-lg" /><span className="font-display text-lg font-semibold tracking-tight">5-Star.AI</span></div>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">Agency owner invitation</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Join {invitation.organizationName}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            You have been invited to manage this agency on 5-Star.AI. Create your owner account with the invited email address below.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invited email</p>
            <p className="mt-1 font-medium text-foreground">{invitation.email}</p>
          </div>
          <Button className="mt-7 w-full" size="lg" onClick={() => setLocation(signUpPath)}>Create owner account</Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">This link expires {new Date(invitation.expiresAt).toLocaleDateString()} and can be used once.</p>
        </div>
      </div>
    </div>
  );
}