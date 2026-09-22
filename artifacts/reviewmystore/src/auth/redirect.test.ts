import { describe, expect, it } from "vitest";
import { signInRedirectFor } from "./redirect";

describe("signInRedirectFor", () => {
  it("preserves the return location without an expiry notice for regular redirects", () => {
    const redirect = signInRedirectFor("/businesses?tab=reviews");

    expect(redirect).toContain(
      `redirect_url=${encodeURIComponent("/businesses?tab=reviews")}`,
    );
    expect(redirect).not.toContain("session_expired");
  });

  it("marks redirects caused by an expired session", () => {
    const redirect = signInRedirectFor("/businesses?tab=reviews", {
      sessionExpired: true,
    });

    expect(redirect).toContain("session_expired=1");
    expect(redirect).toContain(
      `redirect_url=${encodeURIComponent("/businesses?tab=reviews")}`,
    );
  });
});