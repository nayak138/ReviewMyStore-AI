/**
 * The only module allowed to call Google's Places API. `GOOGLE_MAPS_API_KEY`
 * never leaves the server — routes proxy autocomplete/details/photo lookups
 * through this service so the frontend (used pre-registration, before any
 * auth token exists) never sees the key.
 */

const PLACES_BASE = "https://places.googleapis.com/v1";
export const GOOGLE_PLACES_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PLACE_PHOTO_BYTES = 10 * 1024 * 1024;

export class GoogleBusinessLookupError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "GoogleBusinessLookupError";
  }
}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new GoogleBusinessLookupError(
      "Google Places is not configured for this environment.",
      503,
    );
  }
  return key;
}

function isTimeoutError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    ["AbortError", "TimeoutError"].includes(
      (error as { name?: unknown }).name as string,
    ),
  );
}

async function googlePlacesRequest(
  target: string,
  init: RequestInit,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(GOOGLE_PLACES_REQUEST_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetch(target, { ...init, signal });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new GoogleBusinessLookupError(
        "Google Places did not respond in time. Please try again.",
        504,
      );
    }
    throw new GoogleBusinessLookupError(
      "Google Places is temporarily unavailable. Please try again.",
      502,
    );
  }
}

export interface PlaceAutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string | null;
  description: string;
}

export async function autocompletePlaces(
  input: string,
): Promise<PlaceAutocompleteSuggestion[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const res = await googlePlacesRequest(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({ input: trimmed }),
  });

  if (!res.ok) {
    throw new GoogleBusinessLookupError(
      "Google Places autocomplete is temporarily unavailable. Please try again.",
      res.status === 429 ? 429 : 502,
    );
  }

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondaryText: p.structuredFormat?.secondaryText?.text ?? null,
      description: p.text?.text ?? "",
    }));
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  category: string | null;
  formattedAddress: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  userRatingCount: number | null;
  /** Raw Google resource name (e.g. "places/X/photos/Y"), not a public URL.
   * Fetch it through `fetchPlacePhoto` / the photo proxy route. */
  photoName: string | null;
}

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "websiteUri",
  "location",
  "rating",
  "userRatingCount",
  "photos",
  "primaryTypeDisplayName",
].join(",");

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const res = await googlePlacesRequest(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    },
  );

  if (!res.ok) {
    throw new GoogleBusinessLookupError(
      "Google Places details are temporarily unavailable. Please try again.",
      res.status === 429 ? 429 : 502,
    );
  }

  const data = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    photos?: Array<{ name?: string }>;
    primaryTypeDisplayName?: { text?: string };
  };

  return {
    placeId: data.id ?? placeId,
    name: data.displayName?.text ?? "",
    category: data.primaryTypeDisplayName?.text ?? null,
    formattedAddress: data.formattedAddress ?? null,
    phone: data.internationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
    rating: typeof data.rating === "number" ? data.rating : null,
    userRatingCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    photoName: data.photos?.[0]?.name ?? null,
  };
}

const PHOTO_NAME_PATTERN = /^places\/[^/]+\/photos\/[^/]+$/;

function placeIdFromPhotoName(photoName: string): string | null {
  const match = photoName.match(/^places\/([^/]+)\/photos\/[^/]+$/);
  return match?.[1] ?? null;
}

async function requestPlacePhoto(
  photoName: string,
  maxWidthPx: number,
): Promise<Response> {
  return googlePlacesRequest(
    `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}`,
    {
      headers: {
        // Places API (New) expects the key in this header for photo media
        // requests. Keeping it here also guarantees it never reaches the
        // browser-facing photo URL.
        "X-Goog-Api-Key": apiKey(),
      },
    },
  );
}

export async function fetchPlacePhoto(
  photoName: string,
  maxWidthPx = 800,
): Promise<{ contentType: string; data: Buffer }> {
  if (!PHOTO_NAME_PATTERN.test(photoName)) {
    throw new GoogleBusinessLookupError("Invalid photo reference", 400);
  }

  let res = await requestPlacePhoto(photoName, maxWidthPx);

  // Photo resource names can become stale after a business changes its
  // Places photo set. Refresh the place details once and retry with the
  // current resource instead of leaving older review pages blank.
  if (!res.ok && res.status === 400) {
    const placeId = placeIdFromPhotoName(photoName);
    if (placeId) {
      try {
        const freshPlace = await getPlaceDetails(placeId);
        if (freshPlace.photoName && freshPlace.photoName !== photoName) {
          res = await requestPlacePhoto(freshPlace.photoName, maxWidthPx);
        }
      } catch {
        // Preserve the original photo error below if the refresh also fails.
      }
    }
  }

  if (!res.ok) {
    throw new GoogleBusinessLookupError(
      "Google Places photo is temporarily unavailable. Please try again.",
      res.status === 429 ? 429 : 502,
    );
  }

  const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) {
    throw new GoogleBusinessLookupError(
      "Google Places returned an unexpected photo format.",
      502,
    );
  }
  const declaredSize = Number(res.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_PLACE_PHOTO_BYTES) {
    throw new GoogleBusinessLookupError(
      "Google Places returned a photo that is too large.",
      502,
    );
  }
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_PLACE_PHOTO_BYTES) {
    throw new GoogleBusinessLookupError(
      "Google Places returned a photo that is too large.",
      502,
    );
  }
  return { contentType, data };
}
