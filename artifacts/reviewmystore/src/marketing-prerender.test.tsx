import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { renderMarketingRoute } from "./marketing-prerender";
import { DEFAULT_META, marketingRouteMeta } from "./pages/marketing/route-meta";

describe("marketing prerender contract", () => {
  it("renders meaningful body and one H1 for every indexable route without running effects", () => {
    for (const route of Object.keys(marketingRouteMeta())) {
      const html = renderMarketingRoute(route);
      const document = new DOMParser().parseFromString(html, "text/html");
      expect(document.querySelectorAll("h1").length, route).toBe(1);
      expect(document.body.textContent!.length, route).toBeGreaterThan(300);
      expect(document.querySelector('a[href="/terms"]'), route).not.toBeNull();
    }
  });

  it("prerenders the new homepage and its clearly illustrative demo", () => {
    const html = renderMarketingRoute("/");
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector("h1")?.textContent).toContain(
      "Reviews and Replies.",
    );
    expect(document.querySelectorAll("#demo-generator")).toHaveLength(1);
    expect(document.querySelector('[data-testid="button-hero-request-trial"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Illustrative");
    expect(document.body.textContent).toContain("No Sign Up");
    expect(document.body.textContent).toContain("written quote");
    expect(document.body.textContent).toContain(
      "Platform features are free for seven days after access activation.",
    );
    expect(DEFAULT_META.title).toBe("5-Star.AI — Google Review & Reputation Management");
  });

  it("keeps the original homepage available as a non-prerendered backup", () => {
    expect(marketingRouteMeta()).not.toHaveProperty("/home-legacy");
    const html = renderToString(<App ssrPath="/home-legacy" />);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector("h1")?.textContent).toBe(
      "Your reputation deserves a system.",
    );
  });

  it("opens the existing guided-trial request form from the new homepage", async () => {
    render(<App ssrPath="/" />);
    fireEvent.click(screen.getByTestId("button-hero-request-trial"));
    expect(
      await screen.findByRole("dialog", {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "No 5-Star.AI account or credit card is needed to request it",
    );
  });

  it("refuses to render private or unknown routes into public HTML", () => {
    for (const route of [
      "/dashboard",
      "/app/reviews",
      "/home-legacy",
      "/not-a-marketing-route",
    ]) {
      expect(() => renderMarketingRoute(route)).toThrow("Cannot prerender non-marketing route");
    }
  });
});