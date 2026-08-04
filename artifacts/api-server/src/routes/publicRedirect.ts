import { Router, type IRouter, type Request } from "express";
import {
  ResolveRedirectBody,
  ResolveRedirectResponse,
} from "@workspace/api-zod";
import {
  RedirectNotFoundError,
  resolveRedirect,
} from "../services/redirectService";
import { requestMeta } from "../services/scanEventService";

const router: IRouter = Router();

function param(req: Request, name: string): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Unauthenticated: backs the public /r/{code} short links printed on QR
 * codes and written to NFC tags. Every hit is logged as a scan event. */
router.post("/public/redirect/:code/resolve", async (req, res) => {
  const parsed = ResolveRedirectBody.safeParse(req.body ?? {});
  const referrer = parsed.success ? (parsed.data.referrer ?? null) : null;

  try {
    const result = await resolveRedirect(
      param(req, "code"),
      requestMeta(req, referrer),
    );
    res.json(ResolveRedirectResponse.parse(result));
  } catch (err) {
    if (err instanceof RedirectNotFoundError) {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "This link is no longer active.",
      });
      return;
    }
    throw err;
  }
});

export default router;
