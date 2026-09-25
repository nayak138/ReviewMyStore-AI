import { describe, expect, it } from "vitest";
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

  it("prerenders the real homepage and a single live demo, not a placeholder", () => {
    const html = renderMarketingRoute("/");
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector("h1")?.textContent).toBe("Your reputation deserves a system.");
    expect(document.querySelectorAll("#review-demo")).toHaveLength(1);
    expect(document.body.textContent).toContain("No Sign Up");
    expect(document.body.textContent).toContain("written custom quote");
    expect(DEFAULT_META.title).toBe("5-Star.AI — Google Review & Reputation Management");
  });

  it("refuses to render private or unknown routes into public HTML", () => {
    for (const route of ["/dashboard", "/app/reviews", "/not-a-marketing-route"]) {
      expect(() => renderMarketingRoute(route)).toThrow("Cannot prerender non-marketing route");
    }
  });
});