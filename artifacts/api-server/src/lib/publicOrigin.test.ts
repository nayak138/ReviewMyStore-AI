import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import { publicOrigin } from "./publicOrigin";

function requestWith(
  headers: Record<string, string>,
  protocol = "http",
): Request {
  return {
    headers,
    protocol,
    get(name: string) {
      return headers[name.toLowerCase()] ?? null;
    },
  } as unknown as Request;
}

test("publicOrigin uses the forwarded user-facing host and protocol", () => {
  assert.equal(
    publicOrigin(
      requestWith({
        "x-forwarded-host": "published.example.com, internal.service",
        "x-forwarded-proto": "https, http",
        host: "internal.service",
      }),
    ),
    "https://published.example.com",
  );
});

test("publicOrigin falls back to the direct request host", () => {
  assert.equal(
    publicOrigin(requestWith({ host: "localhost:8080" })),
    "http://localhost:8080",
  );
});