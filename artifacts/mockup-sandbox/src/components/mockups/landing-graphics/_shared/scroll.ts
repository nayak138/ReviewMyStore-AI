/** Header-aware, reduced-motion-aware in-page navigation for the homepage. */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function headerOffset(): number {
  if (typeof document === "undefined") return 0;
  const header = document.querySelector<HTMLElement>("[data-marketing-header]");
  return (header?.getBoundingClientRect().height || 76) + 12;
}

export interface ScrollOptions {
  attempts?: number;
  /** Push `#id` into history so back/forward and sharing keep working. */
  updateHash?: boolean;
  onDone?: (el: HTMLElement) => void;
}

export function scrollToSection(id: string, options: ScrollOptions = {}): void {
  const { attempts = 20, updateHash = true, onDone } = options;
  const el = document.getElementById(id);
  if (!el) {
    if (attempts > 0) {
      window.setTimeout(() => scrollToSection(id, { ...options, attempts: attempts - 1 }), 50);
    }
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  if (updateHash && window.location.hash !== `#${id}`) {
    window.history.pushState(window.history.state, "", `#${id}`);
  }
  onDone?.(el);
}

/** Focus a navigated section without a second scroll. */
export function focusSection(el: HTMLElement): void {
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
