import { pool } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { disposeAllRateLimiters } from "./middlewares/rateLimit";
import { getConfiguredOrigins } from "./middlewares/originProtection";
import {
  cleanupCompletedGenerationReservations,
  countStaleCompletedGenerationReservations,
  COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
  recoverStalePendingGenerationReservations,
} from "./services/publicReviewService";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].filter(
    (key) => !process.env[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }

  if (getConfiguredOrigins().size === 0) {
    throw new Error(
      "No trusted browser origins are configured. Set CORS_ALLOWED_ORIGINS or configure the Replit deployment domain.",
    );
  }
}

validateProductionConfiguration();

// Without an error listener, a dropped idle database connection can become an
// unhandled EventEmitter error and terminate the process. node-postgres will
// replace the client after this is logged.
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected idle database client error");
});

const server = app.listen(port);
server.once("listening", () => {
  logger.info({ port }, "Server listening");
});
server.once("error", (err) => {
  logger.fatal({ err, port }, "Unable to listen on configured port");
  disposeAllRateLimiters();
  void pool
    .end()
    .catch((poolError: unknown) => {
      logger.error(
        { err: poolError },
        "Failed to close database pool after listen failure",
      );
    })
    .finally(() => {
      process.exit(1);
    });
});

const RESERVATION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RESERVATION_CLEANUP_BACKLOG_ALERT_AFTER_RUNS = 2;

let consecutiveReservationCleanupFailures = 0;
let consecutiveReservationCleanupBacklogRuns = 0;

async function runReservationCleanup(): Promise<void> {
  try {
    const deletedCount = await cleanupCompletedGenerationReservations();
    const staleCount = await countStaleCompletedGenerationReservations();
    consecutiveReservationCleanupFailures = 0;

    if (deletedCount > 0) {
      logger.info(
        {
          deletedCount,
          staleCount,
          batchSize: COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
          operation: "completed_ai_generation_reservation_retention_cleanup",
        },
        "Cleaned up completed AI generation reservations",
      );
    }

    if (staleCount > 0) {
      consecutiveReservationCleanupBacklogRuns += 1;
      if (
        consecutiveReservationCleanupBacklogRuns >=
        RESERVATION_CLEANUP_BACKLOG_ALERT_AFTER_RUNS
      ) {
        logger.warn(
          {
            staleCount,
            deletedCount,
            batchSize: COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
            consecutiveBacklogRuns: consecutiveReservationCleanupBacklogRuns,
            operation: "completed_ai_generation_reservation_retention_cleanup",
          },
          "Completed AI generation reservation cleanup backlog persists",
        );
      }
    } else {
      consecutiveReservationCleanupBacklogRuns = 0;
    }
  } catch (err) {
    consecutiveReservationCleanupFailures += 1;
    consecutiveReservationCleanupBacklogRuns = 0;
    logger.error(
      {
        err,
        consecutiveFailureCount: consecutiveReservationCleanupFailures,
        operation: "completed_ai_generation_reservation_retention_cleanup",
      },
      "Failed to clean up completed AI generation reservations",
    );
  }
}

void runReservationCleanup();
const reservationCleanupTimer = setInterval(
  runReservationCleanup,
  RESERVATION_CLEANUP_INTERVAL_MS,
);
reservationCleanupTimer.unref();

const PENDING_RESERVATION_RECOVERY_INTERVAL_MS = 5 * 60 * 1000;

async function runPendingReservationRecovery(): Promise<void> {
  try {
    const recoveredCount = await recoverStalePendingGenerationReservations();
    if (recoveredCount > 0) {
      logger.warn(
        {
          recoveredCount,
          operation: "stale_ai_generation_reservation_recovery",
        },
        "Released stale AI generation reservations after an interrupted request",
      );
    }
  } catch (err) {
    logger.error(
      { err, operation: "stale_ai_generation_reservation_recovery" },
      "Failed to recover stale AI generation reservations",
    );
  }
}

void runPendingReservationRecovery();
const pendingReservationRecoveryTimer = setInterval(
  runPendingReservationRecovery,
  PENDING_RESERVATION_RECOVERY_INTERVAL_MS,
);
pendingReservationRecoveryTimer.unref();

/** How long to wait for in-flight requests to drain before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(reservationCleanupTimer);
  clearInterval(pendingReservationRecoveryTimer);

  logger.info({ signal }, "Received shutdown signal; draining connections");

  // Stop accepting new connections; the callback fires once all existing
  // connections have closed (i.e. in-flight requests have drained).
  server.close((err) => {
    clearTimeout(forceExitTimer);
    disposeAllRateLimiters();
    if (err) {
      logger.error({ err }, "Error while closing server");
      void pool
        .end()
        .catch((poolError: unknown) => {
          logger.error({ err: poolError }, "Error while closing database pool");
        })
        .finally(() => {
          process.exit(1);
        });
      return;
    }
    void pool
      .end()
      .then(() => {
        logger.info("Server and database pool closed gracefully");
      })
      .catch((poolError: unknown) => {
        logger.error({ err: poolError }, "Error while closing database pool");
      })
      .finally(() => {
        process.exit(0);
      });
  });

  // Ask idle keep-alive connections to close so close() can complete.
  server.closeIdleConnections?.();

  // Safety net: force exit if connections don't drain in time.
  const forceExitTimer = setTimeout(() => {
    logger.warn(
      { timeoutMs: SHUTDOWN_TIMEOUT_MS },
      "Shutdown timed out; forcing exit",
    );
    server.closeAllConnections?.();
    disposeAllRateLimiters();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
