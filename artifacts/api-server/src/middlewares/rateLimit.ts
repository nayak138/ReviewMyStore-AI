import type { RequestHandler } from "express";

/**
 * Minimal in-memory fixed-window rate limiter, keyed by client IP.
 *
 * Suitable for single-process deployments (this app runs as one Node
 * process). Windows are pruned lazily so the map cannot grow unbounded.
 */
export function rateLimit({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const prune = (now: number) => {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  };

  return (req, res, next) => {
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
}
