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
  const query = `?businessId=${encodeURIComponent(businessId)}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Location workspace</p>
          <p className="truncate text-sm font-semibold text-foreground">{businessName}</p>
        </div>
      </div>
      <nav className="grid gap-1 sm:grid-cols-3" aria-label={`${businessName} workspace`}>
        {tabs.map(({ id, label, icon: Icon, href }) => (
          <Link
            key={id}
            href={`${href}${query}`}
            className={cn(
              "flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
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
    </div>
  );
}