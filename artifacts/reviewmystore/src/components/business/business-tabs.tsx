import { Megaphone, MessageCircleWarning, MessageSquare, Store } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type BusinessWorkspaceTab = "campaigns" | "reviews" | "feedback";

const tabs: Array<{ id: BusinessWorkspaceTab; label: string; icon: typeof Store; href: string }> = [
  { id: "campaigns", label: "Campaigns", icon: Megaphone, href: "/campaigns" },
  { id: "reviews", label: "Review Inbox", icon: MessageSquare, href: "/reviews" },
  { id: "feedback", label: "Feedback", icon: MessageCircleWarning, href: "/feedback" },
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
  const query = `?businessId=${encodeURIComponent(businessId)}&businessName=${encodeURIComponent(businessName)}`;

  return (
    <nav
      className="mx-auto grid w-full max-w-4xl gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:grid-cols-3"
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
  );
}