import {
  DEFAULT_RADIUS_KM,
  MAX_RESULTS_PER_SEARCH,
  parseAddress,
  scoreProspect,
  SECTORS,
} from "./prospects-shared";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Le Pré-Saint-Gervais — home base, used when a town cannot be located.
const HOME = { latitude: 48.8869, longitude: 2.4064 };

export interface FoundProspect {
  external_id: string;
  company_name: string;
  sector: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviews_count: number | null;
  latitude: number | null;
  longitude: number | null;
  score: number;
}

interface PlaceResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
}

function mapsKeys() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error(
      "La recherche de prospects n'est pas configurée (connexion Google Maps manquante).",
    );
  }
  return { lovableKey, mapsKey };
}

/** Locates the centre of a town so the search radius can be applied around it. */
export async function geocodeArea(
  area: string,
): Promise<{ latitude: number; longitude: number }> {
  const { lovableKey, mapsKey } = mapsKeys();
  const url = new URL(`${GATEWAY_URL}/maps/api/geocode/json`);
  url.searchParams.set("address", `${area}, France`);
  url.searchParams.set("language", "fr");
  url.searchParams.set("region", "fr");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });
    if (!response.ok) {
      console.error(`Geocoding failed [${response.status}]: ${await response.text()}`);
      return HOME;
    }
    const payload = (await response.json()) as {
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    const point = payload.results?.[0]?.geometry?.location;
    if (typeof point?.lat === "number" && typeof point?.lng === "number") {
      return { latitude: point.lat, longitude: point.lng };
    }
    return HOME;
  } catch (error) {
    console.error("geocoding error", error);
    return HOME;
  }
}

/** Searches real local businesses through the Google Maps connector gateway. */
export async function searchLocalBusinesses(
  sector: string,
  area: string,
  radiusKm: number = DEFAULT_RADIUS_KM,
): Promise<{ prospects: FoundProspect[]; center: { latitude: number; longitude: number } }> {
  const { lovableKey, mapsKey } = mapsKeys();

  const sectorEntry = SECTORS.find((s) => s.value === sector);
  const phrase = sectorEntry ? sectorEntry.query : sector;
  const textQuery = `${phrase} à ${area}, France`;
  const center = await geocodeArea(area);

  const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.rating",
        "places.userRatingCount",
        "places.location",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "fr",
      regionCode: "FR",
      pageSize: MAX_RESULTS_PER_SEARCH,
      locationBias: {
        circle: { center, radius: Math.round(radiusKm * 1000) },
      },

    }),
  });

  if (response.status === 403) {
    const body = await response.text();
    console.error(`Google Maps denied the search [403]: ${body}`);
    throw new Error(
      "Google Maps a refusé la recherche (clé restreinte). Vérifiez les restrictions de la clé côté Google Cloud.",
    );
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Maps search failed [${response.status}]: ${body}`);
    throw new Error(`La recherche a échoué (${response.status}).`);
  }

  const payload = (await response.json()) as { places?: PlaceResult[] };
  const places = payload.places ?? [];

  const prospects = places
    .filter((p) => p.id && p.displayName?.text)
    .filter((p) => {
      // locationBias is a hint, not a limit — enforce the chosen radius here.
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return true;
      return distanceKm(center, { latitude: lat, longitude: lng }) <= radiusKm * 1.1;
    })
    .slice(0, MAX_RESULTS_PER_SEARCH)

    .map((p) => {
      const parsed = parseAddress(p.formattedAddress);
      const entry = {
        external_id: p.id as string,
        company_name: p.displayName?.text as string,
        sector,
        address: p.formattedAddress ?? null,
        city: parsed.city,
        postal_code: parsed.postalCode,
        website: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        rating: typeof p.rating === "number" ? Number(p.rating.toFixed(1)) : null,
        reviews_count: p.userRatingCount ?? null,
        latitude: typeof p.location?.latitude === "number" ? p.location.latitude : null,
        longitude: typeof p.location?.longitude === "number" ? p.location.longitude : null,
      };
      return {
        ...entry,
        score: scoreProspect({
          postalCode: entry.postal_code,
          website: entry.website,
          phone: entry.phone,
          email: null,
          reviewsCount: entry.reviews_count,
          sector,
        }),
      };
    });

  return { prospects, center };
}
