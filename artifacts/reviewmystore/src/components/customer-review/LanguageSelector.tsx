import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Choose language"
        className="flex items-center gap-2 rounded-full border border-white/15 bg-[#081126]/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-colors hover:bg-[#101d3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Languages className="h-4 w-4 text-slate-300" aria-hidden="true" />
        {current.nativeName}
        <ChevronDown className="h-4 w-4 text-slate-300" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 text-foreground shadow-[0_24px_70px_-32px_hsl(var(--foreground)/0.5)]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === value}
              onClick={() => {
                onChange(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                lang.code === value && "bg-accent",
              )}
            >
              <span className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                {lang.nativeName !== lang.englishName && (
                  <span className="text-xs text-muted-foreground">{lang.englishName}</span>
                )}
              </span>
              {lang.code === value && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
