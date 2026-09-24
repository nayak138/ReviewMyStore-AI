import { pathToFileURL } from "node:url";
import {
  assessReviewImportHistory,
  readReviewImportListEvidence,
  reviewImportDetailsMatch,
  type ReviewImportAttemptEvidence,
} from "../services/reviewImportRecoveryEvidence.ts";

const DEFAULT_API_BASE =
  process.env.BNDLE_SOCIAL_BASE_URL?.replace(/\/$/, "") ??
  "https://api.bundle.social";
const API_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;
type CheckResult = {
  check: "bundle.social review-import recovery";
  result: "passed";
  historyShape: "valid";
  detailShape: "valid";
  uniqueMatch: true;
  ambiguousMatch: true;
  noMatch: true;
  readOnly: true;
};

class SafeCheckError extends Error {}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

async function readJson(
  fetchImpl: typeof fetch,
  url: URL,
  apiKey: string,
  failureLabel: string,
): Promise<JsonRecord> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    throw new SafeCheckError(`${failureLabel} request failed.`);
  }
  if (!response.ok) {
    throw new SafeCheckError(
      `${failureLabel} request failed (HTTP ${response.status}).`,
    );
  }

  try {
    return asRecord(await response.json());
  } catch {
    throw new SafeCheckError(`${failureLabel} response was not valid JSON.`);
  }
}

function importHistoryUrl(teamId: string): URL {
  const url = new URL(
    `${DEFAULT_API_BASE}/api/v1/misc/google-business/reviews/import`,
  );
  url.searchParams.set("teamId", teamId);
  return url;
}

function importDetailUrl(importId: string): URL {
  return new URL(
    `${DEFAULT_API_BASE}/api/v1/misc/google-business/reviews/import/${encodeURIComponent(importId)}`,
  );
}

export async function runBundleSocialImportHistoryCheck(options: {
  apiKey: string;
  teamId: string;
  fetchImpl?: typeof fetch;
}): Promise<CheckResult> {
  const { apiKey, teamId } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!apiKey.trim()) {
    throw new SafeCheckError("BNDLE_SOCIAL_API is required.");
  }
  if (!teamId.trim()) {
    throw new SafeCheckError("BNDLE_REVIEW_RECOVERY_TEST_TEAM_ID is required.");
  }

  const listing = await readJson(
    fetchImpl,
    importHistoryUrl(teamId),
    apiKey,
    "Import history",
  );
  if (!Array.isArray(listing.imports)) {
    throw new SafeCheckError("Import history response shape was not recognized.");
  }

  // The query is scoped to the designated test team. Ignore any records the
  // provider unexpectedly includes for other teams; never request their detail.
  const teamHistory = listing.imports
    .map(asRecord)
    .filter((item) => item.teamId === teamId);
  const usableRecords = teamHistory
    .map((item) => ({
      item,
      evidence: readReviewImportListEvidence(item),
    }))
    .filter(
      (
        entry,
      ): entry is {
        item: JsonRecord;
        evidence: ReviewImportAttemptEvidence & { importId: string };
      } => entry.evidence !== null,
    );

  const uniqueExample = usableRecords.find(({ evidence }) => {
    const assessment = assessReviewImportHistory(teamHistory, evidence);
    return (
      assessment.outcome === "UNIQUE" &&
      assessment.candidates.some(
        (candidate) =>
          String(candidate.id ?? candidate.importId) === evidence.importId,
      )
    );
  });
  if (!uniqueExample) {
    throw new SafeCheckError(
      "No uniquely matchable import exists for the designated test team.",
    );
  }

  const { evidence } = uniqueExample;
  const details = await readJson(
    fetchImpl,
    importDetailUrl(evidence.importId),
    apiKey,
    "Import detail",
  );
  if (!reviewImportDetailsMatch(details, evidence.importId, evidence)) {
    throw new SafeCheckError(
      "Import detail response did not match the recovery evidence shape.",
    );
  }

  const duplicateRecord = {
    ...uniqueExample.item,
    id: `synthetic-duplicate-${evidence.importId}`,
  };
  const ambiguous = assessReviewImportHistory(
    [...teamHistory, duplicateRecord],
    evidence,
  );
  const noMatch = assessReviewImportHistory([], evidence);
  if (ambiguous.outcome !== "AMBIGUOUS" || noMatch.outcome !== "NOT_FOUND") {
    throw new SafeCheckError("Ambiguous/no-match checks did not behave as expected.");
  }

  return {
    check: "bundle.social review-import recovery",
    result: "passed",
    historyShape: "valid",
    detailShape: "valid",
    uniqueMatch: true,
    ambiguousMatch: true,
    noMatch: true,
    readOnly: true,
  };
}

async function main() {
  try {
    const result = await runBundleSocialImportHistoryCheck({
      apiKey: process.env.BNDLE_SOCIAL_API ?? "",
      teamId: process.env.BNDLE_REVIEW_RECOVERY_TEST_TEAM_ID ?? "",
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    const message =
      error instanceof SafeCheckError
        ? error.message
        : "The bundle.social history check could not be completed.";
    console.error(message);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main();
}