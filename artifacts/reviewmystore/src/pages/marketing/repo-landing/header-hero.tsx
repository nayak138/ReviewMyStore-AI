import { useEffect, useState, type FC } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Menu, ShieldCheck, Sparkles, Star, MessageSquare, X } from "lucide-react";
import type { TrialDialogPlacement } from "@/components/book-demo-dialog";
import { BrandIcon, BrandLogo, GoogleLogoSvg } from "./brand";

type ActionProps = {
  onRequestTrial: (placement: TrialDialogPlacement) => void;
  onOpenResources?: () => void;
};

export const Header: FC<ActionProps> = ({ onRequestTrial, onOpenResources }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const listener = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", listener, { passive: true });
    return () => window.removeEventListener("scroll", listener);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const nav = [["Product", "#product-preview"], ["How It Works", "#how-it-works"], ["For Agencies", "#for-agencies"], ["Pricing", "#pricing"], ["Resources", "#resources"]] as const;
  const go = (href: string) => {
    if (href === "#resources" && onOpenResources) onOpenResources();
    setOpen(false);
  };
  return (
    <header className={`sticky top-0 z-40 border-b transition-all duration-200 ${scrolled ? "bg-[#070A13]/90 backdrop-blur-md border-[#1E293B]/70 shadow-lg shadow-black/20" : "bg-[#070A13]/60 backdrop-blur-sm border-[#162035]/40"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-[72px]">
        <a href="#top" aria-label="5-Star.AI Home" data-testid="link-brand-home"><BrandLogo variant="light" size="sm" /></a>
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#C8D1E0]">
          {nav.map(([label, href]) => <a key={label} href={href} onClick={() => go(href)} data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-white transition-colors py-1 text-[14px] tracking-tight">{label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => onRequestTrial("header_desktop")} data-testid="button-header-request-trial" className="hidden sm:inline-flex items-center gap-2 px-[18px] py-2 text-xs font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] rounded-lg shadow-md shadow-blue-900/30 whitespace-nowrap"><span>Request a guided 7-day trial</span><ArrowRight className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setOpen(!open)} data-testid="button-mobile-menu" className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[#C8D1E0] hover:text-white hover:bg-[#162035]" aria-expanded={open} aria-label="Toggle navigation menu">{open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
      </div></div>
      {open && <div className="md:hidden fixed inset-x-0 top-[72px] bottom-0 bg-[#070A13]/98 backdrop-blur-xl border-t border-[#1E293B] z-50 flex flex-col justify-between p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
        <div><div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-2 mb-4">Navigation</div><div className="flex flex-col space-y-2">{nav.map(([label, href]) => <a key={label} href={href} onClick={() => go(href)} data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ", "-")}`} className="px-3 py-2.5 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-[#11182A]">{label}</a>)}</div></div>
        <div className="pt-6 border-t border-[#1E293B] space-y-3 pb-8"><button onClick={() => { setOpen(false); onRequestTrial("header_mobile"); }} data-testid="button-mobile-request-trial" className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] rounded-xl"><span>Request a guided 7-day trial</span><ArrowRight className="w-4 h-4" /></button><p className="text-xs text-center text-slate-400">No credit card required · Setup consultation with a specialist</p></div>
      </div>}
    </header>
  );
};

export const Hero: FC<{ onRequestTrial: (placement: TrialDialogPlacement) => void; onScrollToDemo: () => void }> = ({ onRequestTrial, onScrollToDemo }) => (
  <section id="top" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />
    <div className="absolute top-10 right-10 w-72 h-72 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"><div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
      <div className="lg:col-span-7 space-y-6 sm:space-y-7 flex flex-col items-center lg:items-start text-center lg:text-left">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />Reputation Management For Local Business & Agencies</div>
        <h1 className="w-full tracking-tight leading-[1.18] text-[#F8FAFC]"><span className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2.5 sm:gap-x-3.5 gap-y-2 mb-2"><BrandLogo variant="light" size="responsive" /><span className="font-medium text-slate-300 text-lg sm:text-2xl lg:text-3xl">powered</span><GoogleLogoSvg className="h-6 sm:h-8 lg:h-10 w-auto" /></span><span className="block repo-serif text-3xl sm:text-5xl lg:text-7xl font-normal">Reviews and Replies<span className="text-[#E5C365]">.</span></span></h1>
        <p className="text-base sm:text-lg lg:text-xl text-[#CBD5E1] max-w-2xl leading-relaxed">Invite genuine Google reviews at the natural moment of delight, collect private feedback when things fall short, and draft thoughtful replies in seconds. Customers keep <span className="text-white font-medium">100% control</span> over their wording and always decide what gets shared.</p>
        <div className="w-full sm:w-auto pt-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-4"><button onClick={() => onRequestTrial("hero")} data-testid="button-hero-request-trial" className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] rounded-xl shadow-lg shadow-blue-900/35"><span>Request a guided 7-day trial</span><ArrowRight className="w-4 h-4" /></button><button onClick={onScrollToDemo} data-testid="button-hero-see-demo" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-[#CBD5E1] hover:text-white bg-[#11182A] hover:bg-[#1B243B] border border-[#263352] rounded-xl"><span>See how it works</span><ArrowDown className="w-4 h-4 text-blue-400" /></button></div>
        <div className="pt-1 flex flex-col items-center lg:items-start gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" />7-Day Free Trial</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>No Credit Card</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>No Sign Up</span>
          </div>
          <span className="text-center lg:text-left">No account is needed merely to request access; the trial starts after access activation. No automatic charges.</span>
        </div>
      </div>
      <div className="lg:col-span-5 relative"><div className="relative mx-auto max-w-md lg:max-w-none"><div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-amber-500/20 rounded-2xl blur-lg opacity-70" /><div className="relative rounded-2xl bg-[#0D1322] border border-[#1E293B] shadow-2xl p-5 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]"><div className="flex items-center gap-3"><BrandIcon size={32} /><div><div className="text-sm font-semibold text-white">Cedar & Stone Kitchen</div><div className="text-[11px] text-slate-400">Campaign Link · Table 14</div></div></div><span className="text-[10px] uppercase px-2 py-0.5 rounded text-amber-300 bg-amber-950/60 border border-amber-800/40">Illustrative Demo</span></div>
        <div className="mt-5 space-y-4"><div className="p-3.5 rounded-xl bg-[#11182A] border border-[#1E293B]"><div className="text-xs text-slate-400 mb-2">Customer Rating</div><div className="flex items-center justify-between"><div className="flex gap-1.5 text-amber-400">{[1,2,3,4,5].map((s) => <Star key={s} className="w-5 h-5 fill-amber-400" />)}</div><span className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />5.0 Example</span></div></div><div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300">{["Wood-fired pizza","Attentive service","Cozy patio"].map((t) => <span key={t} className="px-2 py-1 rounded-md bg-[#162035] border border-[#263352]">{t}</span>)}</div><div className="p-3.5 rounded-xl bg-[#090D18] border border-[#22304C]"><div className="flex items-center gap-1 text-[11px] text-blue-400 mb-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" />AI-Assisted Customer Draft <span className="text-slate-400 ml-auto">Editable</span></div><p className="text-xs text-slate-200 leading-relaxed italic">“Had an unforgettable dinner on the patio! The wood-fired crust had the perfect char, and our server Sarah made our anniversary feel truly special.”</p></div><div className="grid grid-cols-2 gap-2"><button onClick={onScrollToDemo} data-testid="button-hero-edit-demo" className="py-2 px-3 text-xs font-medium text-slate-300 bg-[#162035] rounded-lg">Edit My Wording</button><button onClick={onScrollToDemo} data-testid="button-hero-continue-demo" className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-white bg-blue-600 rounded-lg">Continue to demo<ArrowRight className="w-3 h-3" /></button></div></div>
        <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500"><span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />Customer retains 100% control</span><span className="font-mono text-[10px]">Sample data only</span></div>
      </div></div></div>
    </div></div>
  </section>
);