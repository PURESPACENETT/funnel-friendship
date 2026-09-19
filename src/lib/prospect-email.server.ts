/**
 * Finds a professional email for a prospect.
 * Step 1 — reads the company's own website (contact / legal pages).
 * Step 2 — falls back to Apollo.io (people search + enrichment) when connected.
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

/** Ranks generic company inboxes first — they are the ones a cleaning offer should reach. */
function pickBest(candidates: string[], domain: string | null): string | null {
  if (candidates.length === 0) return null;
  const preferred = ["contact@", "info@", "accueil@", "bonjour@", "direction@", "hello@", "commercial@"];
  const sameDomain = domain
    ? candidates.filter((email) => email.endsWith(`@${domain}`) || email.includes(domain))
    : [];
  const pool = sameDomain.length > 0 ? sameDomain : candidates;
  for (const prefix of preferred) {
    const hit = pool.find((email) => email.startsWith(prefix));
    if (hit) return hit;
  }
  return pool[0] ?? null;
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

/** Scans the company website for a public contact address. */
export async function scanWebsiteForEmail(website: string | null | undefined): Promise<string | null> {
  const domain = domainOf(website);
  if (!domain) return null;
  const base = `https://${domain}`;

  const collected: string[] = [];
  for (const path of CONTACT_PATHS) {
    const html = await fetchText(`${base}${path}`);
    if (!html) continue;
    collected.push(...cleanCandidates(html));
    const best = pickBest(collected, domain);
    if (best) return best;
  }
  return pickBest(collected, domain);
}

const APOLLO_GATEWAY = "https://connector-gateway.lovable.dev/apollo";

export function apolloConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["APOLLO_API_KEY"]);
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  organization_name?: string;
}

async function apolloCall(path: string, query: Record<string, string>, body?: unknown) {
  const url = new URL(`${APOLLO_GATEWAY}${path}`);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["APOLLO_API_KEY"] ?? "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Apollo (${response.status}): ${text.slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

/** Looks up a decision-maker email at the company through Apollo.io. */
export async function findEmailViaApollo(input: {
  website?: string | null;
  companyName: string;
}): Promise<{ email: string; contactName: string | null; title: string | null } | null> {
  if (!apolloConfigured()) return null;
  const domain = domainOf(input.website);

  const searchQuery: Record<string, string> = { per_page: "5", page: "1" };
  if (domain) searchQuery["q_organization_domains_list[]"] = domain;
  else searchQuery["q_organization_name"] = input.companyName;
  searchQuery["person_titles[]"] = "owner";

  const search = await apolloCall("/api/v1/mixed_people/api_search", searchQuery);
  const people = (search["people"] as ApolloPerson[] | undefined) ?? [];
  const candidate = people[0];
  if (!candidate) return null;

  const enrich = await apolloCall("/api/v1/people/bulk_match", {}, {
    details: [
      {
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        organization_name: candidate.organization_name ?? input.companyName,
        ...(domain ? { domain } : {}),
        ...(candidate.linkedin_url ? { linkedin_url: candidate.linkedin_url } : {}),
      },
    ],
  });

  const matches = (enrich["matches"] as ApolloPerson[] | undefined) ?? [];
  const match = matches[0];
  const email = match?.email;
  if (!email || email.includes("email_not_unlocked")) return null;

  return {
    email: email.toLowerCase(),
    contactName:
      match?.name ??
      [match?.first_name, match?.last_name].filter(Boolean).join(" ") ??
      null,
    title: match?.title ?? null,
  };
}
