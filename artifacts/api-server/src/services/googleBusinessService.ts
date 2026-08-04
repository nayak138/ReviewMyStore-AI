/**
 * The only module allowed to call Google's Places API. `GOOGLE_MAPS_API_KEY`
 * never leaves the server — routes proxy autocomplete/details/photo lookups
 * through this service so the frontend (used pre-registration, before any
 * auth token exists) never sees the key.
 */

const PLACES_BASE = "https://places.googleapis.com/v1";

export class GoogleBusinessLookupError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "GoogleBusinessLookupError";
  }
}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY must be set. Did you forget to provision the Google Maps secret?",
    );
  }
  return key;
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

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({ input: trimmed }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GoogleBusinessLookupError(
      `Google Places autocomplete failed (${res.status}): ${body}`,
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
  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GoogleBusinessLookupError(
      `Google place details lookup failed (${res.status}): ${body}`,
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

export async function fetchPlacePhoto(
  photoName: string,
  maxWidthPx = 800,
): Promise<{ contentType: string; data: Buffer }> {
  if (!PHOTO_NAME_PATTERN.test(photoName)) {
    throw new GoogleBusinessLookupError("Invalid photo reference", 400);
  }

  const res = await fetch(
    `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey()}`,
  );

  if (!res.ok) {
    throw new GoogleBusinessLookupError(
      `Failed to fetch place photo (${res.status})`,
    );
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const data = Buffer.from(await res.arrayBuffer());
  return { contentType, data };
}
