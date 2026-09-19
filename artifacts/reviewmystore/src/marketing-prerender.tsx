import { renderToString } from "react-dom/server";

import App from "./App";

export function renderMarketingRoute(route: string): string {
  return renderToString(<App ssrPath={route} />);
}