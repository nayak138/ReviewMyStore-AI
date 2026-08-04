import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { 
  LayoutDashboard, 
  Store, 
  Megaphone, 
  QrCode, 
  SmartphoneNfc, 
  BarChart3, 
  ShoppingCart,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", ready: true },
  { name: "Businesses", icon: Store, href: "/businesses", ready: true },
  { name: "Campaigns", icon: Megaphone, href: "/campaigns", ready: true },
  { name: "QR Codes", icon: QrCode, href: "/qr-codes", ready: true },
  { name: "NFC Devices", icon: SmartphoneNfc, href: "/nfc-devices", ready: true },
  { name: "Analytics", icon: BarChart3, href: "/analytics", ready: false },
  { name: "Orders", icon: ShoppingCart, href: "/orders", ready: false },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
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

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-[transform,margin] duration-200 ease-in-out md:relative",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        // Desktop collapse: slide out via negative margin so the content area reclaims the space.
        sidebarCollapsed && "md:-ml-64 md:-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo" className="w-6 h-6" />
            <span className="font-semibold text-sm tracking-tight text-foreground">ReviewMyStore</span>
          </div>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
            
            return (
              <Link key={item.name} href={item.ready ? item.href : "#"}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    !item.ready && "opacity-70 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    if (!item.ready) e.preventDefault();
                    else setMobileMenuOpen(false);
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {!item.ready && (
                    <span className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-semibold">
                      Soon
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
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
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
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
