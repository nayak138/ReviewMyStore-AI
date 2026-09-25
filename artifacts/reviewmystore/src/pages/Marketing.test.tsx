import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Marketing, { SECTION_ORDER } from "./Marketing";

const demoMounts = vi.fn();
const activeHistory: (boolean | undefined)[] = [];
const fetchSpy = vi.fn();

vi.mock("./marketing/review-demo", () => ({
  InteractiveReviewDemo: ({ active }: { active?: boolean }) => {
    const [value, setValue] = useState("");
    useState(() => demoMounts());
    activeHistory.push(active);
    return (
      <section id="review-demo" data-testid="live-demo">
        <label>
          Your draft
          <textarea data-testid="demo-draft" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
      </section>
    );
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
}));

const dialogProps: { marketingDark?: boolean }[] = [];
vi.mock("@/components/book-demo-dialog-lazy", () => ({
  BookDemoDialog: ({ children, marketingDark }: { children: ReactNode; marketingDark?: boolean }) => {
    dialogProps.push({ marketingDark });
    return children;
  },
}));

beforeEach(() => {
  demoMounts.mockClear();
  activeHistory.length = 0;
  dialogProps.length = 0;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Marketing homepage", () => {
  it("renders the approved 15 sections in order with one H1", () => {
    const { container } = render(<Marketing />);
    const ids = Array.from(container.querySelectorAll("main > section[id], main > * > section[id]"))
      .map((s) => s.id)
      .filter((id) => (SECTION_ORDER as readonly string[]).includes(id));
    expect(ids).toEqual([...SECTION_ORDER]);
    expect(SECTION_ORDER).toHaveLength(15);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Your reputation deserves a system.");
    expect(screen.getByRole("heading", { level: 2, name: "Pricing shaped around your business." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Customer stories, with permission." })).toBeInTheDocument();
  });

  it("uses exact navigation labels and a local dark scope", () => {
    render(<Marketing />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Product", "How It Works", "For Agencies", "Pricing", "Resources"]);
    expect(screen.getByTestId("button-header-trial")).toHaveTextContent("Start 7-Day Trial");
    expect(screen.getByTestId("marketing-root")).toHaveClass("dark", "marketing-dark");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(dialogProps.every((p) => p.marketingDark === true)).toBe(true);
    expect(screen.queryByTestId("button-floating-start-free")).not.toBeInTheDocument();
  });

  it("mounts the live demo once and never fetches on render or view switch", () => {
    render(<Marketing />);
    expect(screen.getAllByTestId("live-demo")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    fireEvent.click(screen.getByTestId("walkthrough-tab-customer"));
    fireEvent.click(screen.getByTestId("button-walkthrough-step-customer-2"));
    expect(demoMounts).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retains customer input across Customer → Business → Customer and hides the inactive panel", () => {
    render(<Marketing />);
    fireEvent.change(screen.getByTestId("demo-draft"), { target: { value: "Warm buns, kind staff" } });
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    expect(screen.getByTestId("panel-customer")).not.toBeVisible();
    expect(screen.getByTestId("panel-business")).toBeVisible();
    expect(activeHistory.at(-1)).toBe(false);
    fireEvent.click(screen.getByTestId("experience-tab-customer"));
    expect(screen.getByTestId("demo-draft")).toHaveValue("Warm buns, kind staff");
    expect(activeHistory.at(-1)).toBe(true);
  });

  it("supports arrow-key view switching with roving tabindex", () => {
    render(<Marketing />);
    const customerTab = screen.getByTestId("experience-tab-customer");
    expect(customerTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(customerTab, { key: "ArrowRight" });
    const businessTab = screen.getByTestId("experience-tab-business");
    expect(businessTab).toHaveAttribute("aria-selected", "true");
    expect(businessTab).toHaveAttribute("tabindex", "0");
    expect(customerTab).toHaveAttribute("tabindex", "-1");
  });

  it("walkthrough shares view state and returns focus to the live panel", () => {
    render(<Marketing />);
    fireEvent.change(screen.getByTestId("demo-draft"), { target: { value: "Kept" } });
    fireEvent.click(screen.getByTestId("walkthrough-tab-business"));
    expect(screen.getByTestId("experience-tab-business")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByTestId("walkthrough-tab-customer"));
    fireEvent.click(screen.getByTestId("button-walkthrough-continue"));
    expect(window.scrollTo).toHaveBeenCalled();
    expect(screen.getByTestId("panel-customer")).toHaveFocus();
    expect(screen.getByTestId("demo-draft")).toHaveValue("Kept");
  });

  it("business preview uses labeled fixtures, retains edits per business, and cannot publish", () => {
    render(<Marketing />);
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    expect(screen.getByTestId("label-sample-data")).toHaveTextContent("Sample data — not customer results");
    const reply = screen.getByTestId("textarea-sample-reply");
    fireEvent.change(reply, { target: { value: "Edited reply" } });
    fireEvent.change(screen.getByTestId("select-sample-business"), { target: { value: "juniper-auto" } });
    expect(screen.getByTestId("textarea-sample-reply")).not.toHaveValue("Edited reply");
    fireEvent.change(screen.getByTestId("select-sample-business"), { target: { value: "harbor-bakery" } });
    expect(screen.getByTestId("textarea-sample-reply")).toHaveValue("Edited reply");
    fireEvent.click(screen.getByTestId("experience-tab-customer"));
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    expect(screen.getByTestId("textarea-sample-reply")).toHaveValue("Edited reply");
    expect(screen.getByTestId("button-sample-publish")).toBeDisabled();
  });

  it("contains no unsupported endorsements or public prices", () => {
    const { container } = render(<Marketing />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Google Verified|\bVerified\b|\$\d|per month|\/mo\b/i);
    expect(screen.getByTestId("link-pricing-usage")).toHaveAttribute("href", "https://docs.5-star.ai/usage-and-social");
    expect(screen.getByTestId("link-pricing-terms")).toHaveAttribute("href", "/terms");
    ["button-hero-trial", "button-pricing-trial", "button-final-trial"].forEach((id) =>
      expect(screen.getByTestId(id)).toHaveTextContent("Start 7-Day Free Trial"),
    );
  });
});
