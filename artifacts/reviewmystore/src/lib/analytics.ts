type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

/** Best-effort custom analytics. The app must work when tracking is unavailable. */
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;

  try {
    if (data === undefined) {
      window.umami?.track(name);
    } else {
      window.umami?.track(name, data);
    }
  } catch {
    // Analytics must never interrupt the user flow.
  }
}