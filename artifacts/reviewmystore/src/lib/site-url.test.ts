import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("uses the development fallback only when a production URL is not required", () => {
    expect(resolveSiteUrl(undefined, false)).toBe(DEFAULT_SITE_URL);
    expect(() => resolveSiteUrl(undefined, true)).toThrow(
      "VITE_SITE_URL is required for production builds.",
    );
  });

  it("normalizes an explicit canonical origin", () => {
    expect(resolveSiteUrl(" https://app.example.com/ ", true)).toBe(
      "https://app.example.com",
    );
  });

  it("rejects unsafe or non-origin values", () => {
    for (const invalidUrl of [
      "javascript:alert(1)",
      "https://user:password@example.com",
      "https://example.com/path",
      "https://example.com/?q=1",
      "https://example.com/#fragment",
    ]) {
      expect(() => resolveSiteUrl(invalidUrl, true)).toThrow(
        "VITE_SITE_URL must be a valid http:// or https:// origin.",
      );
    }
  });
});
