import { AtSign, Megaphone, MessageCircleWarning, MessageSquare, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type BusinessWorkspaceTab = "campaigns" | "reviews" | "feedback" | "social-media";

const tabs: Array<{ id: BusinessWorkspaceTab; label: string; icon: typeof Store; href: string }> = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone, href: "/campaigns" },
  { id: "reviews", label: "Review Inbox", icon: MessageSquare, href: "/reviews" },
  { id: "feedback", label: "Feedback", icon: MessageCircleWarning, href: "/feedback" },
  { id: "social-media", label: "Social Media", icon: AtSign, href: "/social-media" },
];

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
  const query = `?businessId=${encodeURIComponent(businessId)}&businessName=${encodeURIComponent(businessName)}`;

  return (
    <>
      <nav
        className="mx-auto hidden w-full max-w-4xl gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:grid sm:grid-cols-4"
        aria-label={`${businessName} workspace`}
      >
        {tabs.map(({ id, label, icon: Icon, href }) => (
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

      <div className="mx-auto w-full max-w-4xl rounded-xl border border-border bg-card p-1 shadow-sm sm:hidden">
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
            {tabs.map(({ id, label, icon: Icon }) => (
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
  );
}