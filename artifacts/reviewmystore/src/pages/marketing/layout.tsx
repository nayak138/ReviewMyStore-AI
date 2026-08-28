import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" aria-hidden="true" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid="button-toggle-theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}

function scrollToId(id: string, attempts = 20) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  } else if (attempts > 0) {
    setTimeout(() => scrollToId(id, attempts - 1), 50);
  }
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location !== "/") setLocation("/");
    scrollToId(id);
  };

  const navLinks = [
    { label: "Features", id: "features" },
    { label: "Solutions", id: "solutions" },
    { label: "Pricing", id: "pricing" },
    { label: "Resources", href: "/resources" },
    { label: "Company", href: "/about" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70">
        <div className={`mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 transition-colors duration-300 sm:px-6 lg:px-8 ${isScrolled ? "bg-background/95 backdrop-blur-xl" : "bg-background/85 backdrop-blur-md"}`}>
          <Link href="/" data-testid="link-home" className="flex shrink-0 items-center">
            <BrandLogo className="h-7 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Main navigation">
            {navLinks.map((link) => {
              const content = <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{link.label}</span>;
              return link.href ? (
                <Link key={link.label} href={link.href} data-testid={`link-nav-${link.label.toLowerCase()}`} className="cursor-pointer">{content}</Link>
              ) : (
                <a key={link.label} href={`#${link.id}`} data-testid={`link-nav-${link.label.toLowerCase()}`} onClick={(e) => goToSection(e, link.id!)} className="cursor-pointer">{content}</a>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            <Link href="/sign-in" data-testid="link-login" className="px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Log in</Link>
            <Button data-testid="button-start-free" onClick={() => setLocation("/sign-up")} className="h-10 rounded-lg bg-primary px-5 font-semibold text-primary-foreground shadow-none hover:bg-primary/90">Start Free</Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 border-b border-border bg-background pt-[4.5rem] lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 p-5" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const content = <span className="py-3 text-base font-medium text-foreground/90">{link.label}</span>;
              return link.href ? (
                <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="border-b border-border/60">{content}</Link>
              ) : (
                <a key={link.label} href={`#${link.id}`} onClick={(e) => { goToSection(e, link.id!); setMobileMenuOpen(false); }} className="border-b border-border/60">{content}</a>
              );
            })}
            <div className="flex flex-col gap-3 pt-7">
              <Button variant="outline" data-testid="button-mobile-login" onClick={() => { setMobileMenuOpen(false); setLocation("/sign-in"); }} className="h-11 w-full rounded-lg text-sm font-semibold">Log in</Button>
              <Button data-testid="button-mobile-start-free" onClick={() => { setMobileMenuOpen(false); setLocation("/sign-up"); }} className="h-11 w-full rounded-lg text-sm font-semibold">Start Free</Button>
            </div>
          </nav>
        </div>
      )}

      <main className="w-full flex-1 overflow-hidden pt-[4.5rem]">{children}</main>

      <footer className="border-t border-border bg-secondary/45 pt-20 pb-8" id="about">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-6">
            <div className="col-span-2">
              <BrandLogo className="mb-4 h-8 w-auto" />
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">A quieter way to turn good customer experiences into more Google Reviews.</p>
              <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/60"><span>Local</span><span>Trusted</span><span>Useful</span></div>
            </div>
            <FooterColumn title="Product" links={[
              { label: "Features", href: "#features", anchor: "features" },
              { label: "AI Auto Reply", href: "#features", anchor: "features" },
              { label: "Review Management", href: "#features", anchor: "features" },
              { label: "QR & NFC", href: "#features", anchor: "features" },
              { label: "Pricing", href: "#pricing", anchor: "pricing" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Solutions" links={[
              { label: "By Industry", href: "#solutions", anchor: "solutions" },
              { label: "For Small Business", href: "#solutions", anchor: "solutions" },
              { label: "For Multi-location", href: "#solutions", anchor: "solutions" },
              { label: "Agencies", href: "#solutions", anchor: "solutions" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Resources" links={[
              { label: "Blog", href: "/blog" }, { label: "Guides", href: "/resources" },
              { label: "Help Center", href: "#faq", anchor: "faq" }, { label: "Templates", href: "/resources" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Company" links={[
              { label: "About Us", href: "/about" }, { label: "Contact Us", href: "mailto:contact@reviewmystore.ai" },
              { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" },
            ]} goToSection={goToSection} />
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm font-medium text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} ReviewMyStore.ai. All rights reserved.</p>
            <p>Built for businesses that care about the details.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links, goToSection }: {
  title: string;
  links: { label: string; href: string; anchor?: string }[];
  goToSection: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold text-foreground">{title}</h4>
      <ul className="space-y-3 text-sm font-medium text-muted-foreground">
        {links.map((link) => <li key={link.label}>
          {link.anchor ? <a href={link.href} onClick={(e) => goToSection(e, link.anchor!)} className="transition-colors hover:text-primary">{link.label}</a> :
            link.href.startsWith("mailto:") ? <a href={link.href} className="transition-colors hover:text-primary">{link.label}</a> :
            <Link href={link.href} className="transition-colors hover:text-primary">{link.label}</Link>}
        </li>)}
      </ul>
    </div>
  );
}