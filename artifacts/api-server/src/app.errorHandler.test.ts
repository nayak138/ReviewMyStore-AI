import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { apiErrorHandler } from "./app";

function runHandler(error: unknown) {
  let status: number | undefined;
  let body: unknown;
  const req = {
    log: {
      warn() {},
      error() {},
    },
  } as unknown as Request;
  const res = {
    headersSent: false,
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;
  apiErrorHandler(error, req, res, (() => {}) as NextFunction);
  return { status, body };
}

test("the API error handler does not expose unexpected error details", () => {
  const result = runHandler(new Error("database connection string leaked here"));
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, {
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred. Please try again.",
  });
});

test("the API error handler gives malformed JSON a stable response", () => {
  const malformedJson = Object.assign(new SyntaxError("Unexpected token"), {
    status: 400,
    type: "entity.parse.failed",
  });
  const result = runHandler(malformedJson);
  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    success: false,
    code: "INVALID_JSON",
    message: "The request body must contain valid JSON.",
  });
});

test("the API error handler keeps known client errors structured", () => {
  const result = runHandler({
    status: 409,
    code: "REVIEW_PROVIDER_OPERATION_IN_PROGRESS",
    message: "A review provider operation is already in progress. Please try again shortly.",
  });
  assert.equal(result.status, 409);
  assert.deepEqual(result.body, {
    success: false,
    code: "REVIEW_PROVIDER_OPERATION_IN_PROGRESS",
    message: "A review provider operation is already in progress. Please try again shortly.",
  });
});