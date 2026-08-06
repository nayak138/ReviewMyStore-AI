import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Menu, X } from "lucide-react";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={cycleTheme} 
      className="w-9 h-9 rounded-full relative text-muted-foreground hover:text-foreground"
      aria-label="Toggle theme"
    >
      {theme === 'light' && <Sun className="w-4 h-4" />}
      {theme === 'dark' && <Moon className="w-4 h-4" />}
      {theme === 'system' && <Monitor className="w-4 h-4" />}
    </Button>
  );
}

function scrollToId(id: string, attempts = 20) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  } else if (attempts > 0) {
    // Element not rendered yet (e.g. we just navigated home) — retry briefly.
    setTimeout(() => scrollToId(id, attempts - 1), 50);
  }
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  /** Smooth-scrolls to a home-page section; navigates home first if needed. */
  const goToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location !== '/') {
      setLocation('/');
    }
    scrollToId(id);
  };
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks: Array<{ label: string; id?: string; href?: string }> = [
    { label: "Features", id: "features" },
    { label: "Solutions", id: "solutions" },
    { label: "Pricing", id: "pricing" },
    { label: "Resources", href: "/resources" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 transition-colors">
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${isScrolled ? "bg-background/80 backdrop-blur-lg border-border" : "bg-transparent border-transparent"}`}>
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <BrandLogo className="h-7 w-auto" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) =>
                link.href ? (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={`#${link.id}`}
                    onClick={(e) => goToSection(e, link.id!)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
            <div className="flex items-center gap-4 border-l border-border pl-6">
              <ThemeToggle />
              <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Login
              </Link>
              <Button 
                onClick={() => setLocation('/sign-up')}
                className="h-9 px-4 shadow-sm hover:shadow transition-all bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                Start Free
              </Button>
            </div>
          </nav>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-16">
          <div className="p-4 flex flex-col gap-4">
            {navLinks.map((link) =>
              link.href ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium py-2 border-b border-border text-foreground cursor-pointer"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    goToSection(e, link.id!);
                    setMobileMenuOpen(false);
                  }}
                  className="text-lg font-medium py-2 border-b border-border text-foreground"
                >
                  {link.label}
                </a>
              )
            )}
            <div className="pt-4 flex flex-col gap-3">
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); setLocation('/sign-in'); }} className="w-full justify-center">Login</Button>
              <Button onClick={() => { setMobileMenuOpen(false); setLocation('/sign-up'); }} className="w-full justify-center">Start Free</Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full overflow-hidden">
        {children}
      </main>

      <footer className="border-t border-border bg-card pt-20 pb-10" id="about">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <BrandLogo className="h-8 w-auto mb-4" />
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
                The AI-Powered Google Review Platform. Turn happy customers into 5-star Google reviews instantly, without the awkward asking.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#solutions" onClick={(e) => goToSection(e, 'solutions')} className="hover:text-primary transition-colors">Solutions</a></li>
                <li><a href="#pricing" onClick={(e) => goToSection(e, 'pricing')} className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-primary transition-colors cursor-pointer">Blog</Link></li>
                <li><Link href="/resources" className="hover:text-primary transition-colors cursor-pointer">Guides & Help</Link></li>
                <li><a href="#faq" onClick={(e) => goToSection(e, 'faq')} className="hover:text-primary transition-colors">Support</a></li>
                <li><Link href="/about" className="hover:text-primary transition-colors cursor-pointer">About</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="mailto:contact@reviewmystore.ai" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} ReviewMyStore.ai. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
