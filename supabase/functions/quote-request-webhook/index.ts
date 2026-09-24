import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://purespacenett.com",
  "https://www.purespacenett.com",
]);

const rate = new Map<string, { windowStart: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://purespacenett.com";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type, x-quote-webhook, x-quote-webhook-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function isString(value: unknown, min = 0, max = 2000) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function isUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
}

function normalize(body: Record<string, unknown>) {
  const clientType = body.clientType ?? body.client_type ?? "entreprise";
  const propertyType = body.propertyType ?? body.property_type ?? "autre";
  const surfaceM2 = body.surfaceM2 ?? body.surface_m2 ?? body.surface;
  const rooms = body.rooms;
  const frequency = body.frequency ?? "ponctuel";
  const services = body.services;
  const city = body.city;
  const postalCode = body.postalCode ?? body.postal_code;
  const desiredDate = body.desiredDate ?? body.desired_date ?? "";
  const contactName = body.contactName ?? body.contact_name ?? body.fullName ?? body.full_name;
  const companyName = body.companyName ?? body.company_name ?? "";
  const email = body.email;
  const phone = body.phone;
  const message = body.message ?? "";
  const sourceExternalId = body.sourceExternalId ?? body.source_external_id;

  const validClientTypes = ["entreprise", "sous_traitance", "particulier"];
  const validPropertyTypes = ["bureaux", "commerce", "immeuble", "chantier", "logement", "autre"];
  const validFrequencies = ["ponctuel", "hebdomadaire", "plusieurs_semaine", "quotidien", "contrat_annuel"];
  const validServices = ["nettoyage_courant", "vitrerie", "remise_en_etat", "fin_de_chantier", "desinfection"];

  if (!validClientTypes.includes(String(clientType))) throw new Error("clientType invalide");
  if (!validPropertyTypes.includes(String(propertyType))) throw new Error("propertyType invalide");
  if (!validFrequencies.includes(String(frequency))) throw new Error("frequency invalide");
  if (!isString(city, 1, 120) || !isString(postalCode, 1, 10)) throw new Error("Ville ou code postal invalide");
  if (!isString(contactName, 2, 120)) throw new Error("Nom du contact invalide");
  if (!isString(companyName, 0, 160)) throw new Error("Nom d'entreprise invalide");
  if (!isString(phone, 6, 30)) throw new Error("Téléphone invalide");
  if (!isString(message, 0, 1500)) throw new Error("Message invalide");
  if (sourceExternalId !== undefined && sourceExternalId !== null && !isUuid(sourceExternalId)) {
    throw new Error("sourceExternalId invalide");
  }
  if (
    typeof email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 255
  ) throw new Error("Email invalide");

  const surface = Number(surfaceM2);
  if (!Number.isInteger(surface) || surface < 1 || surface > 200000) {
    throw new Error("Surface invalide");
  }

  let roomCount: number | null = null;
  if (rooms !== undefined && rooms !== null && rooms !== "") {
    roomCount = Number(rooms);
    if (!Number.isInteger(roomCount) || roomCount < 0 || roomCount > 5000) {
      throw new Error("Nombre de pièces invalide");
    }
  }

  const normalizedServices = Array.isArray(services)
    ? services.map(String).filter((service) => validServices.includes(service))
    : [];

  const score =
    (String(clientType) === "entreprise" || String(clientType) === "sous_traitance" ? 20 : 10) +
    Math.min(30, Math.round(surface / 100)) +
    (String(frequency) === "quotidien" || String(frequency) === "contrat_annuel" ? 25 : 10) +
    normalizedServices.length * 5;

  return {
    full_name: String(contactName).trim(),
    client_type: String(clientType),
    property_type: String(propertyType),
    surface_m2: surface,
    rooms: roomCount,
    frequency: String(frequency),
    services: normalizedServices,
    city: String(city).trim(),
    postal_code: String(postalCode).trim(),
    desired_date: isString(desiredDate, 0, 20) ? String(desiredDate).trim() || null : null,
    contact_name: String(contactName).trim(),
    company_name: String(companyName).trim() || null,
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    message: String(message).trim() || null,
    source_external_id: sourceExternalId ? String(sourceExternalId) : null,
    estimate_min: 0,
    estimate_max: 0,
    score,
    status: "nouveau",
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ ok: false, error: "Origin non autorisée" }, 403, origin);
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, error: "Origin non autorisée" }, 403, origin);
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Méthode non autorisée" }, 405, origin);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) {
    return json({ ok: false, error: "Requête trop volumineuse" }, 413, origin);
  }

  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = rate.get(ip);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    rate.set(ip, { windowStart: now, count: 1 });
  } else {
    current.count += 1;

    if (current.count > MAX_PER_WINDOW) {
      return json(
        { ok: false, error: "Trop de demandes, veuillez réessayer plus tard." },
        429,
        origin,
      );
    }
  }

  try {
    const providedSecret =
      request.headers.get("x-quote-webhook-secret") ||
      request.headers.get("x-quote-webhook");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let secretKeys: Record<string, string> | null = null;
    try {
      secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) : null;
    } catch (error) {
      console.error("Invalid SUPABASE_SECRET_KEYS configuration", error);
      return json({ ok: false, error: "Service temporairement indisponible" }, 503, origin);
    }

    const adminKey = secretKeys?.default || legacyServiceRoleKey;

    if (!supabaseUrl || !adminKey) {
      console.error("Supabase admin credentials unavailable");
      return json({ ok: false, error: "Service temporairement indisponible" }, 503, origin);
    }

    const supabase = createClient(supabaseUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: expectedSecret, error: secretError } = await supabase.rpc(
      "get_quote_webhook_secret",
    );

    if (secretError || !expectedSecret) {
      console.error("Quote webhook secret unavailable", secretError);
      return json({ ok: false, error: "Service temporairement indisponible" }, 503, origin);
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      return json({ ok: false, error: "Non autorisé" }, 401, origin);
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ ok: false, error: "Payload invalide" }, 400, origin);
    }

    const data = normalize(body as Record<string, unknown>);

    if (data.source_external_id) {
      const { data: existing, error: existingError } = await supabase
        .from("quote_requests")
        .select("id, status, created_at")
        .eq("source_external_id", data.source_external_id)
        .maybeSingle();

      if (existingError) {
        console.error("quote_requests idempotency lookup failed", existingError);
        return json({ ok: false, error: "Impossible de vérifier la demande" }, 500, origin);
      }

      if (existing) {
        return json({ ok: true, duplicate: true, request: existing }, 200, origin);
      }
    }

    const { data: inserted, error } = await supabase
      .from("quote_requests")
      .insert(data)
      .select("id, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505" && data.source_external_id) {
        const { data: existing, error: existingError } = await supabase
          .from("quote_requests")
          .select("id, status, created_at")
          .eq("source_external_id", data.source_external_id)
          .maybeSingle();

        if (!existingError && existing) {
          return json({ ok: true, duplicate: true, request: existing }, 200, origin);
        }
      }

      console.error("quote_requests insert failed", error);
      return json(
        { ok: false, error: "Impossible d'enregistrer la demande" },
        500,
        origin,
      );
    }

    return json({ ok: true, request: inserted }, 201, origin);
  } catch (error) {
    console.error("quote-request-webhook error", error);

    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Payload invalide",
      },
      400,
      origin,
    );
  }
});
