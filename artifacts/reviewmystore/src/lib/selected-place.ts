// Carries a Google Place selected on the marketing/landing page through the
// sign-up flow so onboarding can smart-prefill the business form. Session
// storage is scoped to the browser tab and cleared on tab close, which is
// exactly the lifetime we want for a single sign-up journey.

const STORAGE_KEY = "rms_selected_place";

export interface SelectedPlace {
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
  photoName: string | null;
}

export function saveSelectedPlace(place: SelectedPlace): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    // Ignore storage failures (private browsing, quota, etc.) — the user can
    // still fall back to manual/search entry on the next page.
  }
}

export function loadSelectedPlace(): SelectedPlace | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectedPlace) : null;
  } catch {
    return null;
  }
}

export function clearSelectedPlace(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Builds the URL for our server-side Google Photos proxy from a photo resource name. */
export function placePhotoUrl(photoName: string, maxWidthPx = 800): string {
  return `/api/v1/places/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`;
}
