/**
 * Integration regression with the REAL InteractiveReviewDemo (generation is
 * mocked at fetch). Covers pending generation across view switches, no
 * scroll/focus theft, draft retention, walkthrough return and id collisions.
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Marketing from "./Marketing";

vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>5-Star.AI</span> }));
vi.mock("@/lib/vcard", () => ({ downloadVCard: vi.fn() }));
vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
}));
vi.mock("@/components/book-demo-dialog", () => ({
  BookDemoDialog: ({ children }: { children: ReactNode }) => children,
}));

let resolveFetch: (r: Response) => void = () => {};
const fetchMock = vi.fn(
  () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
);
const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as Response;
const scrollIntoView = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, "umami", {
    configurable: true,
    value: { track: vi.fn() },
  });
  fetchMock.mockClear();
  scrollIntoView.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("crypto", { randomUUID: () => "fixed-session" });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("open", vi.fn());
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0; });
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Element.prototype.scrollIntoView = scrollIntoView;
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  delete (window as Window & { umami?: unknown }).umami;
  vi.unstubAllGlobals();
});

const customerPanel = () => screen.getByTestId("panel-customer");
const generateButton = () => within(customerPanel()).getByRole("button", { name: /generate/i });

describe("Marketing with the real live demo", () => {
  it("tracks deliberate Customer/Business switches with fixed view values", () => {
    render(<Marketing />);
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    fireEvent.click(screen.getByTestId("experience-tab-customer"));

    expect(window.umami?.track).toHaveBeenNthCalledWith(1, "landing_view_switched", {
      placement: "experience",
      from_view: "customer",
      to_view: "business",
    });
    expect(window.umami?.track).toHaveBeenNthCalledWith(2, "landing_view_switched", {
      placement: "experience",
      from_view: "business",
      to_view: "customer",
    });
    expect(window.umami?.track).toHaveBeenCalledTimes(2);
  });

  it("has no duplicate element ids", () => {
    const { container } = render(<Marketing />);
    const ids = Array.from(container.querySelectorAll("[id]")).map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const testIds = Array.from(container.querySelectorAll("[data-testid]")).map((e) => e.getAttribute("data-testid"));
    expect(testIds.filter((id, i) => testIds.indexOf(id) !== i)).toEqual([]);
    expect(container.querySelectorAll("#review-demo")).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pending generation resolves while in Business View without scroll/focus theft, then the draft is retained and editable", async () => {
    render(<Marketing />);
    fireEvent.click(within(customerPanel()).getByRole("radio", { name: "4 stars" }));
    fireEvent.click(generateButton());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const businessTab = screen.getByTestId("experience-tab-business");
    fireEvent.click(businessTab);
    businessTab.focus();
    scrollIntoView.mockClear();
    (window.scrollTo as unknown as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => { resolveFetch(ok({ reviewText: "Lovely stay with a kind team." })); });

    const status = screen.getByTestId("status-experience-demo");
    await waitFor(() => expect(status).toHaveTextContent(/draft is ready/i));
    expect(businessTab).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(customerPanel()).not.toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("experience-tab-customer"));
    expect(status).toBeEmptyDOMElement();
    const draft = within(customerPanel()).getByRole("textbox", { name: "Generated Google review" });
    expect(draft).toHaveValue("Lovely stay with a kind team.");
    fireEvent.change(draft, { target: { value: "My own words." } });

    fireEvent.click(screen.getByTestId("experience-tab-business"));
    fireEvent.click(screen.getByTestId("walkthrough-tab-customer"));
    fireEvent.click(screen.getByTestId("button-walkthrough-continue"));
    expect(customerPanel()).toHaveFocus();
    expect(within(customerPanel()).getByRole("textbox", { name: "Generated Google review" })).toHaveValue("My own words.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("following #review-demo selects Customer View when Business is showing", async () => {
    render(<Marketing />);
    fireEvent.click(screen.getByTestId("experience-tab-business"));
    expect(customerPanel()).not.toBeVisible();
    act(() => {
      window.history.pushState(null, "", "#review-demo");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(customerPanel()).toBeVisible();
    await waitFor(() => expect(document.getElementById("review-demo")).toHaveFocus());
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("back/forward to a section hash scrolls and moves focus to that section", async () => {
    render(<Marketing />);
    act(() => {
      window.history.pushState(null, "", "#pricing");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(document.getElementById("pricing")).toHaveFocus());
    expect(document.getElementById("pricing")).toHaveAttribute("tabindex", "-1");
  });
});
