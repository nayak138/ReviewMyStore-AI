import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "./local-link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "./trial-dialog";
import { BrandLogo } from "./brand-logo";
import { focusSection, scrollToSection } from "./scroll";
import "./landing.css";

export const NAV_LINKS: { label: string; id?: string; href?: string }[] = [
  { label: "Product", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "For Agencies", id: "agencies" },
  { label: "Pricing", id: "pricing" },
  { label: "Resources", href: "/resources" },
];

const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");

/**
 * Shared marketing shell. `dark` applies the homepage-only dark environment
 * (scoped `.dark.marketing-dark` wrapper); other marketing routes, the global
 * theme provider and authenticated screens are unaffected.
 */
export function MarketingLayout({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const location = "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMobileMenuOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // While the full-screen menu is open: hide the covered page from focus and
  // assistive tech, contain Tab to toggle + menu, and close on Escape. Both
  // handlers stand down while a (portaled) dialog such as the trial form is open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const covered = [mainRef.current, footerRef.current].filter(Boolean) as HTMLElement[];
    covered.forEach((el) => {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    });
    menuRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const dialogOpen = () => Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'));
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || dialogOpen()) return;
      if (e.key === "Escape") {
        closeMenu(true);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [
        toggleRef.current,
        ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])") ?? []),
      ].filter(Boolean) as HTMLElement[];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      const inside = current ? items.includes(current) : false;
      if (e.shiftKey && (current === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      covered.forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      });
    };
  }, [mobileMenuOpen, closeMenu]);

  const goToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // Let modified/middle clicks keep native open-in-new-tab behaviour.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setMobileMenuOpen(false);
    scrollToSection(id, { onDone: focusSection });
  };

  const linkClass = "text-sm font-medium text-foreground/65 transition-colors hover:text-foreground";

  return (
    <div className={`landing-graphics-scope min-h-[100dvh] font-sans antialiased ${dark ? "dark marketing-dark" : "bg-slate-50 text-zinc-900 dark:bg-slate-950 dark:text-zinc-100"}`} data-testid="marketing-root">
      <header data-marketing-header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${isScrolled ? "border-b border-border/80 bg-background/90 backdrop-blur-xl" : "bg-background/70 backdrop-blur-sm"}`}>
        <div className="mx-auto flex h-[4.75rem] max-w-[80rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" data-testid="link-home" aria-label="5-Star.AI home" className="flex shrink-0 items-center">
            <BrandLogo className="h-9 w-auto max-w-[11.5rem] object-contain sm:h-10" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) =>
              link.href ? (
                <Link key={link.label} href={link.href} data-testid={`link-nav-${slug(link.label)}`} className={linkClass}>{link.label}</Link>
              ) : (
                <a key={link.label} href={`/#${link.id}`} data-testid={`link-nav-${slug(link.label)}`} onClick={(e) => goToSection(e, link.id!)} className={linkClass}>{link.label}</a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <BookDemoDialog marketingDark={dark} placement="header_desktop">
              <Button data-testid="button-header-trial" className="h-10 rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90">
                Start 7-Day Trial <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </BookDemoDialog>
          </div>

          <Button ref={toggleRef} variant="ghost" size="icon" data-testid="button-mobile-menu" onClick={() => (mobileMenuOpen ? closeMenu(false) : setMobileMenuOpen(true))} className="min-h-[44px] min-w-[44px] text-foreground lg:hidden" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} aria-controls="marketing-mobile-menu">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div id="marketing-mobile-menu" ref={menuRef} className="fixed inset-0 z-40 overflow-y-auto bg-background pt-[4.75rem] lg:hidden" data-testid="mobile-menu">
          <nav className="mx-auto flex max-w-2xl flex-col px-5 py-6 sm:px-8" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) =>
              link.href ? (
                <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="min-h-[44px] border-b border-border py-4 text-lg font-medium">{link.label}</Link>
              ) : (
                <a key={link.label} href={`/#${link.id}`} data-testid={`link-mobile-${slug(link.label)}`} onClick={(e) => goToSection(e, link.id!)} className="min-h-[44px] border-b border-border py-4 text-lg font-medium">{link.label}</a>
              ),
            )}
            <BookDemoDialog marketingDark={dark} placement="header_mobile">
              <Button data-testid="button-mobile-trial" className="mt-7 h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                Start 7-Day Trial <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </BookDemoDialog>
          </nav>
        </div>
      )}

      <main ref={mainRef} className="w-full pt-[4.75rem]">{children}</main>

      <footer ref={footerRef} className="border-t border-border bg-secondary/35" id="about">
        <div className="mx-auto max-w-[80rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-12 md:grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr]">
            <div>
              <BrandLogo className="mb-5 h-10 w-auto max-w-[12rem] object-contain" />
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">A hands-on reputation partner for local businesses and the agencies that help them grow.</p>
              <BookDemoDialog marketingDark={dark} placement="footer_team">
                <button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary">Talk with our team <ArrowUpRight className="h-4 w-4" /></button>
              </BookDemoDialog>
            </div>
            <FooterColumn title="Explore" links={[
              { label: "Product", href: "/#features", anchor: "features" },
              { label: "How it works", href: "/#how-it-works", anchor: "how-it-works" },
              { label: "For agencies", href: "/#agencies", anchor: "agencies" },
              { label: "Pricing", href: "/#pricing", anchor: "pricing" },
              { label: "Questions", href: "/#faq", anchor: "faq" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Resources" links={[
              { label: "Resource library", href: "/resources" },
              { label: "Blog", href: "/blog" },
              { label: "About 5-Star.AI", href: "/about" },
              { label: "Docs", href: "#" },
            ]} goToSection={goToSection} />
            <FooterColumn title="Legal" links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
               { label: "Contact", href: "#" },
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
