import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { 
  Store, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  name: string;
  icon: LucideIcon;
  href: string;
  ready: boolean;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { name: "Businesses", icon: Store, href: "/businesses", ready: true },
  { name: "Analytics", icon: BarChart3, href: "/analytics", ready: true },
  { name: "Settings", icon: Settings, href: "/settings", ready: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  businessName?: string | null;
}

export function AppLayout({ children, title, businessName }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    // One hamburger for both worlds: overlay drawer on mobile, collapse on desktop.
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSidebarCollapsed((v) => !v);
    } else {
      setMobileMenuOpen(true);
    }
  };
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Keep the sidebar toggle with the sidebar when it is collapsed or off-canvas. */}
      {(sidebarCollapsed || !mobileMenuOpen) && (
        <button
          type="button"
          className={cn(
            "fixed z-30 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            sidebarCollapsed ? "left-3 top-3 hidden md:flex" : "left-3 top-3 md:hidden",
          )}
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-[transform,margin] duration-200 ease-in-out md:relative",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        // Desktop collapse: slide out via negative margin so the content area reclaims the space.
        sidebarCollapsed && "md:-ml-64 md:-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto max-w-[10rem]" />
          </div>
          <button
            type="button"
            className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.name} item={item} location={location} onNavigate={() => setMobileMenuOpen(false)} />
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden bg-background">
        <header className="h-16 shrink-0 flex items-center justify-between pl-14 pr-4 md:px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {businessName ? (
              <Link
                href="/businesses"
                aria-label={`Open ${businessName} businesses page`}
                className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 -ml-1 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Store className="h-5 w-5 text-primary" aria-hidden="true" />
                <h1 className="truncate text-lg font-semibold text-foreground">{businessName}</h1>
              </Link>
            ) : (
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarNavItem({
  item,
  location,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  location: string;
  onNavigate: () => void;
  depth?: number;
}) {
  const hasActiveChild = item.children?.some(
    (child) => location === child.href || location.startsWith(`${child.href}/`) || child.children?.some((grandchild) => location === grandchild.href),
  ) ?? false;
  const isCurrent = location === item.href || location.startsWith(`${item.href}/`);

  return (
    <div>
      <Link href={item.ready ? item.href : "#"}>
        <div
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            depth > 0 && "ml-3 text-[13px]",
            isCurrent
              ? "bg-primary/10 text-primary dark:bg-primary/20"
              : hasActiveChild
                ? "text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            !item.ready && "cursor-not-allowed opacity-70",
          )}
          onClick={(event) => {
            if (!item.ready) event.preventDefault();
            else onNavigate();
          }}
          aria-current={isCurrent ? "page" : undefined}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.name}
          {!item.ready && (
            <span className="absolute right-3 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground opacity-0 transition-opacity group-hover:opacity-100">
              Soon
            </span>
          )}
        </div>
      </Link>
      {item.children && (
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {item.children.map((child) => (
            <SidebarNavItem key={child.name} item={child} location={location} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
