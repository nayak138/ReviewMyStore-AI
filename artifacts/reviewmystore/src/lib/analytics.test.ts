import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

afterEach(() => {
  delete (window as Window & { umami?: unknown }).umami;
});

describe("trackEvent", () => {
  it("is a no-op when the injected tracker is absent", () => {
    expect(() => trackEvent("demo_event", { outcome: "success" })).not.toThrow();
  });

  it("does not let tracker exceptions interrupt the app", () => {
    Object.defineProperty(window, "umami", {
      configurable: true,
      value: { track: vi.fn(() => { throw new Error("tracker unavailable"); }) },
    });

    expect(() => trackEvent("demo_event", { outcome: "success" })).not.toThrow();
  });
});