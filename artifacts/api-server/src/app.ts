import express, { type Express } from "express";
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

// The app is only reachable through Replit's ingress proxy, which fully
// OVERWRITES X-Forwarded-For with its own verified chain (client-supplied
// XFF values are discarded — verified empirically: a spoofed header never
// reaches the app). Trusting the proxy chain therefore makes req.ip the
// real client address and it cannot be forged by callers.
app.set("trust proxy", true);

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
    if (origin && !isTrustedOrigin(req, origin, configuredOrigins)) {
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
      const allowed = configuredOrigins.has(origin);
      callback(null, allowed ? origin : false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
