import { describe, expect, it } from "vitest";
import { safeHttpUrl, safeSocialUrl } from "./urlValidation";

describe("public URL validation", () => {
  it("allows only http and https website URLs", () => {
    expect(safeHttpUrl("https://example.com")).toBe("https://example.com/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("restricts social links to their expected hosts", () => {
    expect(safeSocialUrl("https://www.instagram.com/example", "instagram")).toBe("https://www.instagram.com/example");
    expect(safeSocialUrl("https://evil.example/instagram", "instagram")).toBeNull();
    expect(safeSocialUrl("https://www.facebook.com/example", "facebook")).toBe("https://www.facebook.com/example");
    expect(safeSocialUrl("https://instagram.com/example", "facebook")).toBeNull();
  });
});