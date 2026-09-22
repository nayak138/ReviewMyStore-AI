import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@workspace/api-client-react";
import {
  isSessionExpiredError,
  onSessionExpired,
  signalSessionExpired,
} from "./session-expiry";

function makeApiError(status: number, data: unknown = null): ApiError {
  const response = new Response(null, { status });
  return new ApiError(response, data, { method: "GET", url: "/api/test" });
}

describe("isSessionExpiredError", () => {
  it("is true for a 401 with no parsed body", () => {
    expect(isSessionExpiredError(makeApiError(401))).toBe(true);
  });

  it("is true for a 401 explicitly coded UNAUTHENTICATED", () => {
    expect(
      isSessionExpiredError(makeApiError(401, { code: "UNAUTHENTICATED" })),
    ).toBe(true);
  });

  it("is false for a 403 (permission/suspended-account errors)", () => {
    expect(
      isSessionExpiredError(makeApiError(403, { code: "ACCOUNT_SUSPENDED" })),
    ).toBe(false);
  });

  it("is false for a 401 carrying an unrelated code", () => {
    expect(
      isSessionExpiredError(makeApiError(401, { code: "SOMETHING_ELSE" })),
    ).toBe(false);
  });

  it("is false for a plain network/offline error", () => {
    expect(isSessionExpiredError(new TypeError("Failed to fetch"))).toBe(
      false,
    );
  });

  it("is false for a non-error value", () => {
    expect(isSessionExpiredError(null)).toBe(false);
    expect(isSessionExpiredError(undefined)).toBe(false);
    expect(isSessionExpiredError("boom")).toBe(false);
  });
});

describe("session-expiry pub/sub", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("notifies every subscribed listener with the signal reason", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = onSessionExpired(first);
    const unsubscribeSecond = onSessionExpired(second);

    signalSessionExpired("api");

    expect(first).toHaveBeenCalledWith("api");
    expect(second).toHaveBeenCalledWith("api");

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("stops notifying a listener after it unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    unsubscribe();

    signalSessionExpired("revalidate");

    expect(listener).not.toHaveBeenCalled();
  });
});
