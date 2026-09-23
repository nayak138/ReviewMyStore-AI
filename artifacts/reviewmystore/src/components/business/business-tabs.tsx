import { AtSign, BarChart3, Megaphone, MessageCircleWarning, MessageSquare, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamAccess, type TeamFeature } from "@/hooks/use-team-access";

export type BusinessWorkspaceTab = "campaigns" | "reviews" | "feedback" | "analytics" | "social-media";

const tabs: Array<{ id: BusinessWorkspaceTab; label: string; icon: typeof Store; href: string }> = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone, href: "/campaigns" },
  { id: "reviews", label: "Review Inbox", icon: MessageSquare, href: "/reviews" },
  { id: "feedback", label: "Feedback", icon: MessageCircleWarning, href: "/feedback" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/business-analytics" },
  { id: "social-media", label: "Social Media", icon: AtSign, href: "/social-media" },
];

const featureForTab: Record<BusinessWorkspaceTab, TeamFeature> = {
  campaigns: "campaignsPermission",
  reviews: "reviewInboxPermission",
  feedback: "feedbackPermission",
  analytics: "analyticsPermission",
  "social-media": "socialMediaPermission",
};

export function BusinessTabs({
  businessId,
  businessName,
  active,
}: {
  businessId: string;
  businessName: string;
  active: BusinessWorkspaceTab;
}) {
  const [, setLocation] = useLocation();
  const { isTeamMember, canView } = useTeamAccess();
  const visibleTabs = tabs.filter(
    ({ id }) => !isTeamMember || canView(businessId, featureForTab[id]),
  );
  const query = `?businessId=${encodeURIComponent(businessId)}&businessName=${encodeURIComponent(businessName)}`;

  return (
    <>
      {isTeamMember && visibleTabs.length === 0 ? (
        <div className="mx-auto w-full max-w-5xl rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-muted-foreground" role="status">
          You no longer have access to this business. Contact the business owner if you think this is a mistake.
        </div>
      ) : (
      <>
      <nav
        className="mx-auto hidden w-full max-w-5xl gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:grid"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        aria-label={`${businessName} workspace`}
      >
        {visibleTabs.map(({ id, label, icon: Icon, href }) => (
          <Link
            key={id}
            href={`${href}${query}`}
            className={cn(
              "flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-current={active === id ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mx-auto w-full max-w-5xl rounded-xl border border-border bg-card p-1 shadow-sm sm:hidden">
        <Select
          value={active}
          onValueChange={(value) => {
            const tab = tabs.find((candidate) => candidate.id === value);
            if (tab) setLocation(`${tab.href}${query}`);
          }}
        >
          <SelectTrigger className="h-10 w-full border-0 bg-primary text-primary-foreground shadow-sm focus:ring-0" aria-label={`${businessName} workspace`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <SelectItem key={id} value={id}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </>
      )}
    </>
  );
}