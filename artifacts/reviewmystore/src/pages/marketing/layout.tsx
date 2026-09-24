import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "@/components/book-demo-dialog";
import { BrandLogo } from "@/components/brand-logo";

function scrollToId(id: string, attempts = 20) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (attempts > 0) {
    window.setTimeout(() => scrollToId(id, attempts - 1), 50);
  }
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const goToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location !== "/") setLocation("/");
    scrollToId(id);
  };

  const navLinks = [
    { label: "Approach", id: "approach" },
    { label: "How it works", id: "how-it-works" },
    { label: "For agencies", id: "agencies" },
    { label: "Resources", href: "/resources" },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-24 font-sans text-zinc-900 antialiased dark:bg-slate-950 dark:text-zinc-100">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isScrolled ? "border-b border-border/80 bg-background/90 backdrop-blur-xl" : "bg-background/70 backdrop-blur-sm"}`}>
        <div className="mx-auto flex h-[4.75rem] max-w-[80rem] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" data-testid="link-home" className="flex shrink-0 items-center">
            <BrandLogo className="h-9 w-auto max-w-[11.5rem] object-contain sm:h-10" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) =>
              link.href ? (
                <Link key={link.label} href={link.href} data-testid={`link-nav-${link.label.toLowerCase().replaceAll(" ", "-")}`} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={`#${link.id}`} data-testid={`link-nav-${link.label.toLowerCase().replaceAll(" ", "-")}`} onClick={(e) => goToSection(e, link.id!)} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/about" className="px-2 text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">About</Link>
            <BookDemoDialog>
              <Button data-testid="button-header-book-demo" className="h-10 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-[0_7px_18px_-11px_hsl(var(--foreground)/0.7)] hover:bg-foreground/90">
                Book a strategy call <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Button>
            </BookDemoDialog>
          </div>

          <Button variant="ghost" size="icon" data-testid="button-mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)} className="min-h-[44px] min-w-[44px] text-foreground transition-all duration-150 active:scale-95 lg:hidden" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 pt-[4.75rem] lg:hidden">
          <nav className="mx-auto flex max-w-2xl flex-col px-5 py-6 sm:px-8" aria-label="Mobile navigation">
            {navLinks.map((link) =>
              link.href ? (
                <Link key={link.label} href={link.href} className="min-h-[44px] border-b border-border py-4 text-lg font-medium">{link.label}</Link>
              ) : (
                <a key={link.label} href={`#${link.id}`} onClick={(e) => goToSection(e, link.id!)} className="min-h-[44px] border-b border-border py-4 text-lg font-medium">{link.label}</a>
              ),
            )}
            <Link href="/about" className="min-h-[44px] border-b border-border py-4 text-lg font-medium">About</Link>
            <BookDemoDialog>
              <Button data-testid="button-mobile-book-demo" className="mt-7 h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                Book a strategy call <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </BookDemoDialog>
          </nav>
        </div>
      )}

      <main className="w-full overflow-hidden pb-6 pt-[4.75rem]">{children}</main>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md items-center justify-between gap-3 border-t border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Start Free</span>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">No credit card needed</span>
        </div>
        <BookDemoDialog>
          <Button data-testid="button-floating-start-free" className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-150 hover:bg-indigo-700 active:scale-95 dark:shadow-indigo-950/50">
            Get Started Now <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </BookDemoDialog>
      </div>

      <footer className="border-t border-border bg-secondary/35" id="about">
        <div className="mx-auto max-w-[80rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-12 md:grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr]">
            <div>
              <BrandLogo className="mb-5 h-10 w-auto max-w-[12rem] object-contain" />
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">A hands-on reputation partner for local businesses and the agencies that help them grow.</p>
              <BookDemoDialog>
                <button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary">Talk with our team <ArrowUpRight className="h-4 w-4" /></button>
              </BookDemoDialog>
            </div>
            <FooterColumn title="Explore" links={[
              { label: "Approach", href: "#approach", anchor: "approach" },
              { label: "How it works", href: "#how-it-works", anchor: "how-it-works" },
              { label: "For agencies", href: "#agencies", anchor: "agencies" },
              { label: "Questions", href: "#faq", anchor: "faq" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Resources" links={[
              { label: "Resource library", href: "/resources" },
              { label: "Blog", href: "/blog" },
              { label: "About 5-Star.AI", href: "/about" },
              { label: "Docs", href: "https://5-star-ai.notion.site/5-STAR-AI-DOCS-3e5e55dd92d580d79d1ecb93dea84e2d" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Legal" links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
               { label: "Contact", href: "mailto:hello@5-star.ai" },
            ]} goToSection={goToSection} />
          </div>
          <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} 5-Star.AI. All rights reserved.</p>
            <p>Good work deserves to be found.</p>
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
      <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/50">{title}</h4>
      <ul className="space-y-3 text-sm text-foreground/75">
        {links.map((link) => (
          <li key={link.label}>
            {link.anchor ? <a href={link.href} onClick={(e) => goToSection(e, link.anchor!)} className="transition-colors hover:text-primary">{link.label}</a> :
              link.href.startsWith("https://") ? <a href={link.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">{link.label}</a> :
              link.href.startsWith("mailto:") ? <a href={link.href} className="transition-colors hover:text-primary">{link.label}</a> :
                <Link href={link.href} className="transition-colors hover:text-primary">{link.label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}