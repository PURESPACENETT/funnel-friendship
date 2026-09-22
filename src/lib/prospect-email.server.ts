/**
 * Finds contact details for a prospect.
 * Step 1 — reads the company's own website (home, contact, legal, team pages) for public addresses,
 *          including mailto: links and obfuscated writings ("nom (at) domaine (point) fr").
 * Step 2 — asks Clay for the decision-maker's name and role at that company.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const BAD_FRAGMENTS = [
  "noreply",
  "no-reply",
  "ne-pas-repondre",
  "example.com",
  "sentry",
  "wixpress",
  "wordpress",
  "squarespace",
  "shopify",
  "cloudflare",
  "googlemail.com/mail",
  "domain.com",
  "email.com",
  "votre-email",
  "@sentry.io",
  // placeholders souvent laissés dans les modèles de site
  "domaine.com",
  "utilisateur@",
  "votre@",
  "nom@",
  "prenom.nom",
  "monemail",
  "adresse@",
  "test@",
  "exemple@",
  "email@email",
  "user@",
  // adresses juridiques / RGPD : ne jamais démarcher
  "dpo@",
  "rgpd@",
  "privacy@",
  "abuse@",
  "postmaster@",
  "webmaster@",
  "hostmaster@",
];

const BAD_SUFFIXES = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".css",
  ".js",
  ".json",
  ".webp2",
  ".ico",
  ".pdf",
  ".mp4",
];

/** Pages most likely to publish a real inbox, cheapest first. */
const CONTACT_PATHS = [
  "",
  "/contact",
  "/contacts",
  "/contact.html",
  "/contact-us",
  "/nous-contacter",
  "/nous-joindre",
  "/demande-de-devis",
  "/devis",
  "/mentions-legales",
  "/mentions-legales.html",
  "/legal",
  "/cgv",
  "/politique-de-confidentialite",
  "/a-propos",
  "/qui-sommes-nous",
  "/equipe",
  "/notre-equipe",
  "/impressum",
];

/** Rewrites the common ways a site hides an address from scrapers. */
function deobfuscate(html: string): string {
  return html
    .replace(/&#(\d{1,4});/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]{2,4});/gi, (_m, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&commat;|&#64;|%40/gi, "@")
    .replace(/\s*(?:\(|\[|\{)\s*(?:at|arobase|chez)\s*(?:\)|\]|\})\s*/gi, "@")
    .replace(/\s+(?:at|arobase)\s+/gi, "@")
    .replace(/\s*(?:\(|\[|\{)\s*(?:dot|point|punkt)\s*(?:\)|\]|\})\s*/gi, ".")
    .replace(/\s+(?:dot|point)\s+/gi, ".");
}

/** Addresses written inside mailto: links are the most reliable signal on a page. */
function mailtoCandidates(html: string): string[] {
  const out: string[] = [];
  const re = /mailto:([^"'?>\s]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = decodeURIComponent(match[1] ?? "").trim().toLowerCase();
    if (raw && EMAIL_RE.test(raw)) out.push(raw);
    EMAIL_RE.lastIndex = 0;
  }
  return out;
}

function isUsable(email: string): boolean {
  if (email.length > 120 || email.length < 6) return false;
  if (BAD_FRAGMENTS.some((bad) => email.includes(bad))) return false;
  if (BAD_SUFFIXES.some((bad) => email.endsWith(bad))) return false;
  // Une adresse valide n'enchaîne pas les points ni ne finit par un chiffre de hash
  if (email.includes("..") || email.startsWith(".") || email.includes("@.")) return false;
  const tld = email.split(".").pop() ?? "";
  if (tld.length < 2 || tld.length > 12) return false;
  return true;
}

function cleanCandidates(html: string): string[] {
  const readable = deobfuscate(html);
  const found = [...mailtoCandidates(readable), ...(readable.match(EMAIL_RE) ?? [])];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of found) {
    const email = raw.toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, "");
    if (seen.has(email)) continue;
    if (!isUsable(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

const PREFERRED = [
  "contact@",
  "info@",
  "infos@",
  "accueil@",
  "bonjour@",
  "hello@",
  "direction@",
  "commercial@",
  "devis@",
  "secretariat@",
  "administratif@",
  "gestion@",
  "agence@",
  "service@",
];

/** Ranks generic company inboxes on the company's own domain first. */
function rank(candidates: string[], domain: string | null): string[] {
  const root = domain ? domain.split(".").slice(-2).join(".") : null;
  const sameDomain = root ? candidates.filter((email) => email.endsWith(`@${domain}`) || email.endsWith(`.${root}`) || email.endsWith(`@${root}`)) : [];
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
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

/** Contact-ish internal links discovered on the homepage, so odd URL schemes are covered too. */
function contactLinksFrom(html: string, origin: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && out.length < 6) {
    const href = (match[1] ?? "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (!/contact|joindre|devis|mentions|legal|equipe|propos|impressum/i.test(href)) continue;
    try {
      const url = new URL(href, origin);
      if (url.origin !== origin) continue;
      const clean = `${url.origin}${url.pathname}`;
      if (!out.includes(clean)) out.push(clean);
    } catch {
      continue;
    }
  }
  return out;
}

/** Scans the company website and returns every usable public address, best first. */
export async function scanWebsiteForEmails(
  website: string | null | undefined,
): Promise<string[]> {
  const domain = domainOf(website);
  if (!domain) return [];

  // Certains sites ne répondent que sur www, d'autres uniquement sans.
  const bases = [`https://${domain}`, `https://www.${domain}`];
  let origin = bases[0]!;
  let home = "";
  for (const base of bases) {
    home = await fetchText(base);
    if (home) {
      origin = base;
      break;
    }
  }

  const collected: string[] = [];
  const push = (emails: string[]) => {
    for (const email of emails) if (!collected.includes(email)) collected.push(email);
  };

  push(cleanCandidates(home));

  const discovered = home ? contactLinksFrom(home, origin) : [];
  const targets = [
    ...discovered,
    ...CONTACT_PATHS.filter((path) => path).map((path) => `${origin}${path}`),
  ].filter((url, index, all) => all.indexOf(url) === index);

  // Par lots de 4 pour rester rapide sans matraquer le site.
  for (let index = 0; index < targets.length && collected.length < 10; index += 4) {
    const batch = targets.slice(index, index + 4);
    const pages = await Promise.all(batch.map((url) => fetchText(url)));
    for (const page of pages) {
      if (page) push(cleanCandidates(page));
    }
  }

  return rank(collected, domain).slice(0, 10);
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
