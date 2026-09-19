import { MAX_RESULTS_PER_SEARCH, parseAddress, scoreProspect, SECTORS } from "./prospects-shared";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

// Le Pré-Saint-Gervais — home base, results are biased around it.
const HOME = { latitude: 48.8869, longitude: 2.4064 };
const RADIUS_M = 25000;

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
}

/** Searches real local businesses through the Google Maps connector gateway. */
export async function searchLocalBusinesses(
  sector: string,
  area: string,
): Promise<FoundProspect[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error(
      "La recherche de prospects n'est pas configurée (connexion Google Maps manquante).",
    );
  }

  const sectorEntry = SECTORS.find((s) => s.value === sector);
  const phrase = sectorEntry ? sectorEntry.query : sector;
  const textQuery = `${phrase} à ${area}, France`;

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
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "fr",
      regionCode: "FR",
      pageSize: MAX_RESULTS_PER_SEARCH,
      locationBias: { circle: { center: HOME, radius: RADIUS_M } },
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

  return places
    .filter((p) => p.id && p.displayName?.text)
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
}
