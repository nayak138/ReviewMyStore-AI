import { renderToString } from "react-dom/server";

import App from "./App";
import { marketingRouteMeta } from "./pages/marketing/route-meta";

export function renderMarketingRoute(route: string): string {
  if (!Object.hasOwn(marketingRouteMeta(), route)) {
    throw new Error(`Cannot prerender non-marketing route: ${route}`);
  }
  const body = renderToString(<App ssrPath={route} />);
  // A successful bundle is not enough: keep meaningful, unambiguous content
  // available to readers and crawlers before client-side hydration.
  if ((body.match(/<h1(?:\s|>)/g) ?? []).length !== 1) {
    throw new Error(`Marketing route must contain exactly one H1: ${route}`);
  }
  return body;
}