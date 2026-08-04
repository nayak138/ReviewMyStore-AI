import { Router, type IRouter } from "express";
import {
  AutocompletePlacesResponse,
  GetPlaceDetailsResponse,
} from "@workspace/api-zod";
import {
  GoogleBusinessLookupError,
  autocompletePlaces,
  fetchPlacePhoto,
  getPlaceDetails,
} from "../services/googleBusinessService";

const router: IRouter = Router();

/** Every route here is intentionally public: business search happens on the
 * marketing/registration flow, before any account or auth token exists. The
 * Google Maps API key stays server-side in googleBusinessService.ts. */

router.get("/places/autocomplete", async (req, res) => {
  const input = typeof req.query.input === "string" ? req.query.input : "";
  if (!input.trim()) {
    res.status(400).json({
      success: false,
      code: "INVALID_QUERY",
      message: "The 'input' query parameter is required.",
    });
    return;
  }

  try {
    const suggestions = await autocompletePlaces(input);
    res.json(AutocompletePlacesResponse.parse({ suggestions }));
  } catch (err) {
    if (err instanceof GoogleBusinessLookupError) {
      res.status(502).json({
        success: false,
        code: "GOOGLE_PLACES_ERROR",
        message: err.message,
      });
      return;
    }
    throw err;
  }
});

router.get("/places/details/:placeId", async (req, res) => {
  const raw = req.params.placeId;
  const placeId = Array.isArray(raw) ? raw[0] : raw;

  try {
    const details = await getPlaceDetails(placeId);
    res.json(GetPlaceDetailsResponse.parse(details));
  } catch (err) {
    if (err instanceof GoogleBusinessLookupError) {
      res.status(502).json({
        success: false,
        code: "GOOGLE_PLACES_ERROR",
        message: err.message,
      });
      return;
    }
    throw err;
  }
});

router.get("/places/photo", async (req, res) => {
  const name = typeof req.query.name === "string" ? req.query.name : "";

  try {
    const { contentType, data } = await fetchPlacePhoto(name);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", contentType);
    res.send(data);
  } catch (err) {
    if (err instanceof GoogleBusinessLookupError) {
      res.status(err.status).json({
        success: false,
        code: "GOOGLE_PLACES_ERROR",
        message: err.message,
      });
      return;
    }
    throw err;
  }
});

export default router;
