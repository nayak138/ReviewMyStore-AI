import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MarketingLayout } from "./layout";

const docsUrl = "https://docs.5-star.ai/";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/components/book-demo-dialog", () => ({
  BookDemoDialog: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MarketingLayout footer", () => {
  it("links to the public Docs page in a safe new tab", () => {
    render(<MarketingLayout><div /></MarketingLayout>);
    const docsLink = screen.getByRole("link", { name: "Docs" });
    expect(docsLink).toHaveAttribute("href", docsUrl);
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
    ["Blog", "Privacy", "Terms", "Contact", "About 5-Star.AI"].forEach((name) =>
      expect(screen.getByRole("link", { name })).toBeInTheDocument(),
    );
  });

  it("is not dark unless the homepage opts in", () => {
    render(<MarketingLayout><div /></MarketingLayout>);
    expect(screen.getByTestId("marketing-root")).not.toHaveClass("marketing-dark");
    expect(screen.queryByTestId("button-floating-start-free")).not.toBeInTheDocument();
  });
});

describe("Mobile menu", () => {
  it("opens with expanded semantics and closes on Escape, restoring focus", () => {
    vi.useFakeTimers();
    render(<MarketingLayout><div /></MarketingLayout>);
    const toggle = screen.getByTestId("button-mobile-menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "marketing-mobile-menu");
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    act(() => { vi.runAllTimers(); });
    expect(toggle).toHaveFocus();
  });

  it("closes on a same-page anchor and scrolls below the fixed header", () => {
    render(
      <MarketingLayout>
        <section id="pricing">Pricing</section>
      </MarketingLayout>,
    );
    fireEvent.click(screen.getByTestId("button-mobile-menu"));
    fireEvent.click(screen.getByTestId("link-mobile-pricing"));
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: expect.any(String) }));
    expect(window.location.hash).toBe("#pricing");
  });

  it("uses instant scrolling when reduced motion is preferred", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<MarketingLayout><section id="features" /></MarketingLayout>);
    fireEvent.click(screen.getByTestId("link-nav-product"));
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });
});

describe("Mobile overlay containment", () => {
  const renderOpen = () => {
    render(
      <MarketingLayout>
        <a href="/behind" data-testid="behind">Behind</a>
      </MarketingLayout>,
    );
    fireEvent.click(screen.getByTestId("button-mobile-menu"));
  };

  it("makes main and footer inert and hidden while open, restoring on close", () => {
    renderOpen();
    const main = screen.getByRole("main", { hidden: true });
    const footer = document.querySelector("footer")!;
    expect(main).toHaveAttribute("inert");
    expect(main).toHaveAttribute("aria-hidden", "true");
    expect(footer).toHaveAttribute("inert");
    fireEvent.click(screen.getByTestId("button-mobile-menu"));
    expect(main).not.toHaveAttribute("inert");
    expect(footer).not.toHaveAttribute("aria-hidden");
  });

  it("loops Tab between the toggle and the last menu control in both directions", () => {
    renderOpen();
    const toggle = screen.getByTestId("button-mobile-menu");
    const last = screen.getByTestId("button-mobile-trial");
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(toggle).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    screen.getByTestId("behind").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(toggle).toHaveFocus();
  });

  it("does not close the menu or trap Tab while a dialog is open", () => {
    renderOpen();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    const field = document.createElement("input");
    dialog.appendChild(field);
    document.body.appendChild(dialog);
    field.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(field).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    dialog.remove();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
  });

  it("keeps native behaviour for modified clicks on section links", () => {
    render(<MarketingLayout><section id="pricing" /></MarketingLayout>);
    const link = screen.getByTestId("link-nav-pricing");
    const allowed = fireEvent.click(link, { metaKey: true });
    expect(allowed).toBe(true);
    expect(window.scrollTo).not.toHaveBeenCalled();
    const middle = fireEvent.click(link, { ctrlKey: true });
    expect(middle).toBe(true);
  });
});
