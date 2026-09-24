type JsonRecord = Record<string, unknown>;

export type ReviewImportAttemptEvidence = {
  teamId: string;
  requestedCount: number;
  attemptedAt: Date;
};

export type ReviewImportEvidenceAssessment = {
  outcome: "UNIQUE" | "AMBIGUOUS" | "NOT_FOUND";
  candidates: JsonRecord[];
};

const IMPORT_EVIDENCE_TIME_TOLERANCE_MS = 2 * 60_000;
const KNOWN_PROVIDER_IMPORT_STATUSES = new Set([
  "PENDING",
  "FETCHING_REVIEWS",
  "COMPLETED",
  "FAILED",
  "RATE_LIMITED",
]);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function valueString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function valueNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown): Date | null {
  const raw = valueString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function importCreatedAt(record: JsonRecord): Date | null {
  return (
    asDate(record.createdAt) ??
    asDate(record.startedAt) ??
    asDate(record.updatedAt)
  );
}

export function getReviewImportId(record: JsonRecord): string | null {
  return valueString(record.id) ?? valueString(record.importId);
}

export function getReviewImportTeamId(record: JsonRecord): string | null {
  return valueString(record.teamId);
}

/**
 * Reads only fields needed to build a smoke-check attempt from a real history
 * record. Incomplete records are not used as evidence for the live check.
 */
export function readReviewImportListEvidence(
  record: JsonRecord,
): (ReviewImportAttemptEvidence & { importId: string }) | null {
  const importId = getReviewImportId(record);
  const teamId = getReviewImportTeamId(record);
  const requestedCount = valueNumber(record.requestedCount);
  const attemptedAt = importCreatedAt(record);
  if (!importId || !teamId || requestedCount === null || !attemptedAt) {
    return null;
  }
  return { importId, teamId, requestedCount, attemptedAt };
}

function matchesAttemptTime(value: Date | null, attemptedAt: Date) {
  return (
    value !== null &&
    Math.abs(value.getTime() - attemptedAt.getTime()) <=
      IMPORT_EVIDENCE_TIME_TOLERANCE_MS
  );
}

export function assessReviewImportHistory(
  imports: JsonRecord[],
  attempt: ReviewImportAttemptEvidence,
): ReviewImportEvidenceAssessment {
  const candidates = imports.filter((item) => {
    if (!getReviewImportId(item)) return false;
    const listedTeam = getReviewImportTeamId(item);
    if (listedTeam && listedTeam !== attempt.teamId) return false;
    const requestedCount = valueNumber(item.requestedCount);
    if (
      requestedCount !== null &&
      requestedCount !== attempt.requestedCount
    ) {
      return false;
    }
    const createdAt = importCreatedAt(item);
    return createdAt === null || matchesAttemptTime(createdAt, attempt.attemptedAt);
  });

  return {
    outcome:
      candidates.length === 1
        ? "UNIQUE"
        : candidates.length === 0
          ? "NOT_FOUND"
          : "AMBIGUOUS",
    candidates,
  };
}

export function reviewImportDetailsMatch(
  details: JsonRecord,
  importId: string,
  attempt: ReviewImportAttemptEvidence,
): boolean {
  const detailCreatedAt = importCreatedAt(asRecord(details));
  const providerStatus = valueString(details.status);
  return (
    valueString(details.id) === importId &&
    getReviewImportTeamId(details) === attempt.teamId &&
    valueNumber(details.requestedCount) === attempt.requestedCount &&
    matchesAttemptTime(detailCreatedAt, attempt.attemptedAt) &&
    providerStatus !== null &&
    KNOWN_PROVIDER_IMPORT_STATUSES.has(providerStatus)
  );
}