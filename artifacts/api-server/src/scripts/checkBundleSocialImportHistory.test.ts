import {
  bndleCalls,
  providerFetch,
  resetCalls,
} from "../testSupport/fakeProviderFetch.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBundleSocialImportHistoryCheck } from "./checkBundleSocialImportHistory.ts";

test("bundle.social import history check is scoped, read-only, and redacted", async () => {
  const teamId = "designated-test-team";
  const importId = "test-import-42";
  const attemptedAt = "2026-09-20T12:00:00.000Z";
  const credential = "test-only-provider-credential";
  const unrelatedBusinessName = "Unrelated Customer Business";
  resetCalls();
  providerFetch.handler = (url) => {
    if (
      url.pathname.endsWith("/misc/google-business/reviews/import") &&
      url.searchParams.get("teamId") === teamId
    ) {
      return {
        body: {
          imports: [
            {
              id: importId,
              teamId,
              requestedCount: 10,
              createdAt: attemptedAt,
              status: "COMPLETED",
            },
            {
              id: "unrelated-import",
              teamId: "another-team",
              requestedCount: 5,
              createdAt: attemptedAt,
              businessName: unrelatedBusinessName,
              customerEmail: "customer@example.test",
            },
          ],
        },
      };
    }
    if (url.pathname.endsWith(`/misc/google-business/reviews/import/${importId}`)) {
      return {
        body: {
          id: importId,
          teamId,
          requestedCount: 10,
          createdAt: attemptedAt,
          status: "COMPLETED",
        },
      };
    }
    return { status: 404, body: {} };
  };

  const summary = await runBundleSocialImportHistoryCheck({
    apiKey: credential,
    teamId,
  });
  const calls = bndleCalls();
  assert.equal(summary.result, "passed");
  assert.equal(summary.uniqueMatch, true);
  assert.equal(summary.ambiguousMatch, true);
  assert.equal(summary.noMatch, true);
  assert.equal(summary.readOnly, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.method === "GET"));
  assert.ok(
    calls.every(
      (call) => !call.url.includes("unrelated-import") && !call.url.includes("another-team"),
    ),
  );

  const printedSummary = JSON.stringify(summary);
  assert.ok(!printedSummary.includes(credential));
  assert.ok(!printedSummary.includes(teamId));
  assert.ok(!printedSummary.includes(importId));
  assert.ok(!printedSummary.includes(unrelatedBusinessName));
  assert.ok(!printedSummary.includes("customer@example.test"));
});