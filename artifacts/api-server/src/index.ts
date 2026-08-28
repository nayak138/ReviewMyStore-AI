import app from "./app";
import { logger } from "./lib/logger";
import { disposeAllRateLimiters } from "./middlewares/rateLimit";
import {
  cleanupCompletedGenerationReservations,
  COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
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

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

const RESERVATION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runReservationCleanup(): Promise<void> {
  try {
    const deletedCount = await cleanupCompletedGenerationReservations();
    if (deletedCount > 0) {
      logger.info(
        {
          deletedCount,
          batchSize: COMPLETED_RESERVATION_CLEANUP_BATCH_SIZE,
        },
        "Cleaned up completed AI generation reservations",
      );
    }
  } catch (err) {
    logger.error(
      { err },
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

/** How long to wait for in-flight requests to drain before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(reservationCleanupTimer);

  logger.info({ signal }, "Received shutdown signal; draining connections");

  // Stop accepting new connections; the callback fires once all existing
  // connections have closed (i.e. in-flight requests have drained).
  server.close((err) => {
    disposeAllRateLimiters();
    if (err) {
      logger.error({ err }, "Error while closing server");
      process.exit(1);
    }
    logger.info("Server closed gracefully");
    process.exit(0);
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
