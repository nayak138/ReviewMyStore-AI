import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { ChevronDown, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} 
      className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground dark:text-muted-foreground/70 dark:hover:text-slate-100"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </Button>
  );
}

function scrollToId(id: string, attempts = 20) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
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
    if (location !== '/') setLocation('/');
    scrollToId(id);
  };

  const navLinks = [
    { label: "Features", id: "features", hasDropdown: true },
    { label: "Solutions", id: "solutions", hasDropdown: true },
    { label: "Pricing", id: "pricing", hasDropdown: false },
    { label: "Resources", href: "/resources", hasDropdown: true },
    { label: "Company", href: "/about", hasDropdown: true },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-blue-100 transition-colors text-foreground font-sans">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div className={`container mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-5 ${isScrolled ? "border-border/80 bg-background/85 shadow-[0_12px_40px_-24px_hsl(var(--foreground)/0.45)] backdrop-blur-xl" : "border-transparent bg-background/55 backdrop-blur-sm"}`}>
          <Link href="/" className="flex items-center gap-2 cursor-pointer shrink-0">
            <BrandLogo className="h-7 w-auto" />
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => {
                const isAnchor = !link.href;
                const content = (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                    {link.hasDropdown && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />}
                  </span>
                );
                return isAnchor ? (
                  <a key={link.label} href={`#${link.id}`} onClick={(e) => goToSection(e, link.id!)} className="cursor-pointer">
                    {content}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href!} className="cursor-pointer">
                    {content}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle />
            <Link href="/sign-in" className="text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer px-2">
              Log in
            </Link>
            <Button 
              onClick={() => setLocation('/sign-up')}
              className="h-10 px-6 rounded-full shadow-sm hover:shadow-md transition-all bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Start Free
            </Button>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-16 border-b border-border">
          <div className="p-4 flex flex-col gap-4">
            {navLinks.map((link) => {
              const isAnchor = !link.href;
              const content = <span className="text-lg font-semibold py-2 text-foreground/90">{link.label}</span>;
              return isAnchor ? (
                <a key={link.label} href={`#${link.id}`} onClick={(e) => { goToSection(e, link.id!); setMobileMenuOpen(false); }} className="border-b border-border/50">
                  {content}
                </a>
              ) : (
                <Link key={link.label} href={link.href!} onClick={() => setMobileMenuOpen(false)} className="border-b border-border/50 cursor-pointer">
                  {content}
                </Link>
              );
            })}
            <div className="pt-6 flex flex-col gap-3">
              <Button variant="outline" onClick={() => { setMobileMenuOpen(false); setLocation('/sign-in'); }} className="w-full justify-center h-12 rounded-xl text-base font-semibold">Log in</Button>
              <Button onClick={() => { setMobileMenuOpen(false); setLocation('/sign-up'); }} className="w-full justify-center h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white">Start Free</Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full overflow-hidden pt-16">
        {children}
      </main>

      <footer className="bg-muted/30 dark:bg-muted/10 pt-16 pb-8 border-t border-border" id="about">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
            <div className="col-span-2">
              <BrandLogo className="h-8 w-auto mb-4" />
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
                The AI-powered Google Review Platform that helps businesses collect, manage and grow reviews effortlessly.
              </p>
              <div className="flex items-center gap-4 text-muted-foreground/70">
                <span aria-hidden="true">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></span>
                <span aria-hidden="true">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></span>
                <span aria-hidden="true">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></span>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-blue-600 transition-colors">AI Auto Reply</a></li>
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-blue-600 transition-colors">Review Management</a></li>
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-blue-600 transition-colors">QR Codes</a></li>
                <li><a href="#features" onClick={(e) => goToSection(e, 'features')} className="hover:text-blue-600 transition-colors">NFC Devices</a></li>
                <li><a href="#pricing" onClick={(e) => goToSection(e, 'pricing')} className="hover:text-blue-600 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm">Solutions</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><a href="#solutions" onClick={(e) => goToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors">By Industry</a></li>
                <li><a href="#solutions" onClick={(e) => goToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors">For Small Business</a></li>
                <li><a href="#solutions" onClick={(e) => goToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors">For Multi-location</a></li>
                <li><a href="#solutions" onClick={(e) => goToSection(e, 'solutions')} className="hover:text-blue-600 transition-colors">Agencies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><Link href="/blog" className="hover:text-blue-600 transition-colors cursor-pointer">Blog</Link></li>
                <li><Link href="/resources" className="hover:text-blue-600 transition-colors cursor-pointer">Guides</Link></li>
                <li><a href="#faq" onClick={(e) => goToSection(e, 'faq')} className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><Link href="/resources" className="hover:text-blue-600 transition-colors cursor-pointer">Templates</Link></li>
                <li><Link href="/resources" className="hover:text-blue-600 transition-colors cursor-pointer">Webinars</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><Link href="/about" className="hover:text-blue-600 transition-colors cursor-pointer">About Us</Link></li>
                <li><Link href="/about" className="hover:text-blue-600 transition-colors cursor-pointer">Careers</Link></li>
                <li><Link href="/about" className="hover:text-blue-600 transition-colors cursor-pointer">Partners</Link></li>
                <li><a href="mailto:contact@reviewmystore.ai" className="hover:text-blue-600 transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors cursor-pointer">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors cursor-pointer">Terms of Service</Link></li>
                <li><Link href="/terms" className="hover:text-blue-600 transition-colors cursor-pointer">Refund Policy</Link></li>
                <li><Link href="/privacy" className="hover:text-blue-600 transition-colors cursor-pointer">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground font-medium">
            <p>© {new Date().getFullYear()} ReviewMyStore.ai. All rights reserved.</p>
            <p className="mt-4 md:mt-0">Made with <span className="text-red-500">❤️</span> for businesses worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
