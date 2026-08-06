import type { RequestHandler } from "express";

export type RateLimitMiddleware = RequestHandler & {
  /** Stops the periodic prune interval (e.g. on server shutdown or in tests). */
  dispose: () => void;
};

/**
 * Minimal in-memory fixed-window rate limiter, keyed by client IP.
 *
 * Suitable for single-process deployments (this app runs as one Node
 * process). Expired entries are pruned periodically (every windowMs) so
 * the map stays bounded regardless of traffic volume; a size-triggered
 * prune remains as a backstop for bursts within a window.
 */
export function rateLimit({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): RateLimitMiddleware {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const prune = (now: number) => {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  };

  // Periodic cleanup keeps memory bounded during long uptimes even when
  // traffic never pushes the map past the size backstop. `unref()` lets
  // the process (and tests) exit without waiting on this timer.
  const interval = setInterval(() => prune(Date.now()), windowMs);
  interval.unref?.();

  const middleware: RequestHandler = (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10_000) prune(now);

    // req.ip is resolved by Express from the trusted proxy chain (see
    // `trust proxy` in app.ts). Replit's ingress proxy overwrites any
    // client-supplied X-Forwarded-For, so this cannot be spoofed.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader(
        "Retry-After",
        Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      );
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
      });
      return;
    }
    next();
  };

  return Object.assign(middleware, {
    dispose: () => clearInterval(interval),
  });
}
