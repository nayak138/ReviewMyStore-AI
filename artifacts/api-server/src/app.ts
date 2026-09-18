import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import {
  getConfiguredOrigins,
  isTrustedOrigin,
  originProtection,
} from "./middlewares/originProtection";

const app: Express = express();

// Replit's ingress replaces X-Forwarded-For, so one trusted proxy hop lets
// Express derive the real client IP without trusting arbitrary multi-hop
// forwarded-header chains.
app.set("trust proxy", 1);

interface RequestError {
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  message?: unknown;
  type?: unknown;
}

function statusFromError(error: unknown): number {
  if (!error || typeof error !== "object") return 500;
  const typed = error as RequestError;
  const candidate =
    typeof typed.status === "number" ? typed.status : typed.statusCode;
  return typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate < 600
    ? candidate
    : 500;
}

function isMalformedJsonError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    (error as RequestError).type === "entity.parse.failed",
  );
}

function safeClientErrorCode(error: unknown, fallback: string): string {
  const code =
    error &&
    typeof error === "object" &&
    typeof (error as RequestError).code === "string"
      ? (error as RequestError).code
      : fallback;
  return typeof code === "string" && /^[A-Z0-9_]{3,80}$/.test(code)
    ? code
    : fallback;
}

export const apiErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isMalformedJsonError(error)) {
    req.log.warn({ err: error }, "Rejected malformed JSON request body");
    res.status(400).json({
      success: false,
      code: "INVALID_JSON",
      message: "The request body must contain valid JSON.",
    });
    return;
  }

  const status = statusFromError(error);
  const isClientError = status >= 400 && status < 500;
  const typed = error as RequestError;
  const message =
    isClientError && typeof typed?.message === "string"
      ? typed.message
      : status === 503 || status === 504
        ? "A dependent service is temporarily unavailable. Please try again."
        : "An unexpected error occurred. Please try again.";

  if (isClientError) {
    req.log.warn({ err: error, status }, "Request failed");
  } else {
    req.log.error({ err: error, status }, "Unhandled API error");
  }

  res.status(status).json({
    success: false,
    code: safeClientErrorCode(
      error,
      isClientError ? "REQUEST_FAILED" : "INTERNAL_ERROR",
    ),
    message,
  });
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const configuredOrigins = getConfiguredOrigins();
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.get("origin");
    if (origin && !isTrustedOrigin(origin, configuredOrigins)) {
      res.status(403).json({
        success: false,
        code: "ORIGIN_NOT_ALLOWED",
        message: "Request origin is not allowed.",
      });
      return;
    }
  }
  next();
});
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed = isTrustedOrigin(origin, configuredOrigins);
      callback(null, allowed ? origin : false);
    },
  }),
);
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use(originProtection);
app.use("/api", router);
app.use(apiErrorHandler);

export default app;
