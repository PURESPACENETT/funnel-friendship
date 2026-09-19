/**
 * Finds contact details for a prospect.
 * Step 1 — reads the company's own website (contact / legal pages) for public addresses.
 * Step 2 — asks Clay for the decision-maker's name and role at that company.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const BAD_FRAGMENTS = [
  "noreply",
  "no-reply",
  "example.com",
  "sentry",
  "wixpress",
  "wordpress",
  "domain.com",
  "email.com",
  "votre-email",
  "@sentry.io",
];

const BAD_SUFFIXES = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"];

const CONTACT_PATHS = ["", "/contact", "/contacts", "/nous-contacter", "/mentions-legales", "/a-propos"];

function cleanCandidates(html: string): string[] {
  const found = html.match(EMAIL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of found) {
    const email = raw.toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, "");
    if (seen.has(email)) continue;
    if (BAD_FRAGMENTS.some((bad) => email.includes(bad))) continue;
    if (BAD_SUFFIXES.some((bad) => email.endsWith(bad))) continue;
    if (email.length > 120) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

const PREFERRED = ["contact@", "info@", "accueil@", "bonjour@", "direction@", "hello@", "commercial@"];

/** Ranks generic company inboxes first — they are the ones a cleaning offer should reach. */
function rank(candidates: string[], domain: string | null): string[] {
  const sameDomain = domain
    ? candidates.filter((email) => email.endsWith(`@${domain}`) || email.includes(domain))
    : [];
  const rest = candidates.filter((email) => !sameDomain.includes(email));
  const ordered = [...sameDomain, ...rest];
  return ordered.sort((a, b) => {
    const rankOf = (email: string) => {
      const index = PREFERRED.findIndex((prefix) => email.startsWith(prefix));
      return index === -1 ? PREFERRED.length : index;
    };
    return rankOf(a) - rankOf(b);
  });
}

export function domainOf(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PureSpaceNettBot/1.0)" },
    });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("text/plain")) return "";
    return (await response.text()).slice(0, 400000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/** Scans the company website and returns every usable public address, best first. */
export async function scanWebsiteForEmails(
  website: string | null | undefined,
): Promise<string[]> {
  const domain = domainOf(website);
  if (!domain) return [];
  const base = `https://${domain}`;

  const collected: string[] = [];
  for (const path of CONTACT_PATHS) {
    const html = await fetchText(`${base}${path}`);
    if (!html) continue;
    for (const email of cleanCandidates(html)) {
      if (!collected.includes(email)) collected.push(email);
    }
    if (collected.length >= 8) break;
  }
  return rank(collected, domain).slice(0, 8);
}

/** Convenience wrapper: the single best public address for this company. */
export async function scanWebsiteForEmail(
  website: string | null | undefined,
): Promise<string | null> {
  const emails = await scanWebsiteForEmails(website);
  return emails[0] ?? null;
}

const CLAY_GATEWAY = "https://connector-gateway.lovable.dev/clay";

export function clayConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["CLAY_API_KEY"]);
}

interface ClayPerson {
  name?: string;
  first_name?: string;
  last_name?: string;
  url?: string;
  domain?: string;
  latest_experience_title?: string;
  structured_location?: { country_iso?: string | null; city?: string | null };
}

async function clayCall(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${CLAY_GATEWAY}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["CLAY_API_KEY"] ?? "",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Clay (${response.status}): ${text.slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

const DECISION_KEYWORDS = [
  "gérant",
  "gerant",
  "dirigeant",
  "président",
  "president",
  "directeur",
  "directrice",
  "owner",
  "founder",
  "fondateur",
  "office manager",
  "services généraux",
  "achats",
  "general manager",
  "ceo",
];

/** Looks up the person to address at this company through Clay (name + role, no email). */
export async function findContactViaClay(input: {
  website?: string | null;
  companyName: string;
}): Promise<{ contactName: string; title: string | null; linkedin: string | null } | null> {
  if (!clayConfigured()) return null;
  const domain = domainOf(input.website);
  if (!domain) return null;

  const created = await clayCall("/search/filters-mode", {
    source_type: "people",
    filters: { company_identifier: [domain] },
  });
  const searchId = created["search_id"];
  if (typeof searchId !== "string") return null;

  const run = await clayCall(`/search/filters-mode/${searchId}/run`, { limit: 25 });
  const people = (run["data"] as ClayPerson[] | undefined) ?? [];
  if (people.length === 0) return null;

  const french = people.filter(
    (person) => (person.structured_location?.country_iso ?? "FR").toUpperCase() === "FR",
  );
  const pool = french.length > 0 ? french : people;

  const decisionMaker =
    pool.find((person) => {
      const title = (person.latest_experience_title ?? "").toLowerCase();
      return DECISION_KEYWORDS.some((keyword) => title.includes(keyword));
    }) ?? pool[0];

  if (!decisionMaker) return null;

  const contactName =
    decisionMaker.name ??
    [decisionMaker.first_name, decisionMaker.last_name].filter(Boolean).join(" ");
  if (!contactName) return null;

  return {
    contactName: contactName.replace(/\s*\[[^\]]*\]\s*/g, " ").trim(),
    title: decisionMaker.latest_experience_title ?? null,
    linkedin: decisionMaker.url ?? null,
  };
}
