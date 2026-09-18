import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";
import {
  getConfiguredOrigins,
  isTrustedOrigin,
  originProtection,
} from "./originProtection";

function makeRequest(
  method: string,
  origin?: string,
  headers: Record<string, string | undefined> = {},
): Request {
  return {
    method,
    protocol: "https",
    get(name: string) {
      if (name.toLowerCase() === "origin") return origin;
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

test("CORS origins are exact, normalized origins rather than wildcards", () => {
  const configured = getConfiguredOrigins(
    "https://review.example.com/, https://admin.example.com",
    "",
    "",
  );
  assert.deepEqual([...configured].sort(), [
    "https://admin.example.com",
    "https://review.example.com",
  ]);
  assert.equal(isTrustedOrigin("https://review.example.com", configured), true);
  assert.equal(isTrustedOrigin("https://evil.example.com", configured), false);
});

test("forwarded host headers never make an origin trusted", () => {
  const configured = getConfiguredOrigins("https://review.example.com", "", "");
  assert.equal(isTrustedOrigin("https://evil.example.com", configured), false);

  let nextCalled = false;
  let statusCode: number | undefined;
  originProtection(
    makeRequest("POST", "https://evil.example.com", {
      "x-forwarded-host": "evil.example.com",
      "x-forwarded-proto": "https",
      host: "evil.example.com",
    }),
    {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response,
    (() => {
      nextCalled = true;
    }) as NextFunction,
  );

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
});

test("unknown browser origins are rejected for state-changing requests", () => {
  let nextCalled = false;
  let statusCode: number | undefined;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;

  originProtection(
    makeRequest("POST", "https://evil.example.com"),
    res,
    (() => {
      nextCalled = true;
    }) as NextFunction,
  );

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.deepEqual(body, {
    success: false,
    code: "ORIGIN_NOT_ALLOWED",
    message: "Request origin is not allowed.",
  });
});

test("requests without Origin remain available to non-browser clients", () => {
  let nextCalled = false;
  originProtection(
    makeRequest("POST"),
    {} as Response,
    (() => {
      nextCalled = true;
    }) as NextFunction,
  );
  assert.equal(nextCalled, true);
});
