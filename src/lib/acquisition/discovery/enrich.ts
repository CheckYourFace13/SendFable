import {
  emailLocalPart,
  isLikelyPersonalConsumerEmail,
  isValidEmailSyntax,
  normalizeDomain,
  preferredBusinessLocalParts,
} from "@/lib/acquisition/normalize";

export type EnrichmentResult = {
  ok: boolean;
  activeWebsite: boolean;
  statusCode?: number;
  htmlSnippet?: string;
  emails: string[];
  contactPageUrl?: string;
  newsletterPresent: boolean;
  eventsPromotionsPresent: boolean;
  competitorPlatform?: string;
  evidenceSnippets: string[];
  error?: string;
};

const COMPETITOR_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "Mailchimp", re: /mailchimp\.com|list-manage\.com|chimpstatic/i },
  { name: "Constant Contact", re: /constantcontact\.com|ctctcdn/i },
  { name: "MailerLite", re: /mailerlite\.com|assets\.mlcdn/i },
  { name: "Brevo", re: /brevo\.com|sendinblue\.com|sibforms/i },
  { name: "Klaviyo", re: /klaviyo\.com/i },
  { name: "EmailOctopus", re: /emailoctopus\.com/i },
];

const NEWSLETTER_RE =
  /newsletter|email\s*signup|join\s+our\s+list|subscribe\s+to\s+our|get\s+our\s+emails|mailing\s+list/i;
const EVENTS_RE =
  /upcoming\s+events|specials|happy\s+hour|weekly\s+special|new\s+release|tap\s*takeover|live\s+music|book\s+now|this\s+week/i;

function extractEmails(html: string, pageDomain: string): string[] {
  const found = new Set<string>();
  const mailto = html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
  for (const m of mailto) {
    const e = m[1].toLowerCase();
    if (isValidEmailSyntax(e)) found.add(e);
  }
  // Visible emails near contact language — still only from page text
  const naked = html.matchAll(
    /(?:^|[^a-z0-9._%+-])([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})(?![a-z0-9._%+-])/gi
  );
  for (const m of naked) {
    const e = m[1].toLowerCase();
    if (!isValidEmailSyntax(e)) continue;
    // Prefer same-domain or preferred local parts; skip obvious image/asset noise
    if (e.endsWith(".png") || e.endsWith(".jpg") || e.includes("example.com")) continue;
    const local = emailLocalPart(e);
    const ed = e.split("@")[1] || "";
    if (
      ed === pageDomain ||
      ed.endsWith(`.${pageDomain}`) ||
      preferredBusinessLocalParts().has(local) ||
      !isLikelyPersonalConsumerEmail(e)
    ) {
      found.add(e);
    }
  }
  return [...found];
}

function pickBestEmail(emails: string[], pageDomain: string): string | undefined {
  if (emails.length === 0) return undefined;
  const preferred = preferredBusinessLocalParts();
  const scored = emails.map((e) => {
    let s = 0;
    const local = emailLocalPart(e);
    const ed = e.split("@")[1] || "";
    if (ed === pageDomain || ed.endsWith(`.${pageDomain}`)) s += 50;
    if (preferred.has(local)) s += 30;
    if (!isLikelyPersonalConsumerEmail(e)) s += 10;
    if (local.includes("noreply") || local.includes("no-reply")) s -= 100;
    return { e, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.s > 0 ? scored[0].e : scored[0]?.e;
}

function detectCompetitor(html: string): string | undefined {
  for (const c of COMPETITOR_PATTERNS) {
    if (c.re.test(html)) return c.name;
  }
  return undefined;
}

function snippetAround(html: string, re: RegExp): string | undefined {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = text.match(re);
  if (!m || m.index === undefined) return undefined;
  const start = Math.max(0, m.index - 40);
  return text.slice(start, start + 160);
}

export function analyzeHtml(html: string, website: string): Omit<EnrichmentResult, "ok" | "activeWebsite" | "statusCode"> & {
  bestEmail?: string;
} {
  const domain = normalizeDomain(website);
  const emails = extractEmails(html, domain);
  const newsletterPresent = NEWSLETTER_RE.test(html);
  const eventsPromotionsPresent = EVENTS_RE.test(html);
  const competitorPlatform = detectCompetitor(html);
  const evidenceSnippets: string[] = [];
  const ns = snippetAround(html, NEWSLETTER_RE);
  if (ns) evidenceSnippets.push(ns);
  const es = snippetAround(html, EVENTS_RE);
  if (es) evidenceSnippets.push(es);
  return {
    emails,
    bestEmail: pickBestEmail(emails, domain),
    newsletterPresent,
    eventsPromotionsPresent,
    competitorPlatform,
    evidenceSnippets,
    htmlSnippet: html.slice(0, 500),
  };
}

/** Fetch a public website homepage (and optional /contact) — no CAPTCHA bypass. */
export async function enrichWebsite(
  website: string,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch }
): Promise<EnrichmentResult & { bestEmail?: string }> {
  const fetchFn = opts?.fetchImpl || fetch;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const url = website.startsWith("http") ? website : `https://${website}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetchFn(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SendFableAcquisitionBot/1.0 (+https://sendfable.com; B2B research)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      return {
        ok: false,
        activeWebsite: false,
        statusCode: res.status,
        emails: [],
        newsletterPresent: false,
        eventsPromotionsPresent: false,
        evidenceSnippets: [],
        error: `http_${res.status}`,
      };
    }
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
      return {
        ok: true,
        activeWebsite: true,
        statusCode: res.status,
        emails: [],
        newsletterPresent: false,
        eventsPromotionsPresent: false,
        evidenceSnippets: [],
        error: "not_html",
      };
    }
    let html = await res.text();
    html = html.slice(0, 500_000);
    let analysis = analyzeHtml(html, url);

    // Optional contact page follow when no email yet
    if (!analysis.bestEmail) {
      const contactHref = html.match(
        /href=["']([^"']*(?:contact|about)[^"']*)["']/i
      )?.[1];
      if (contactHref && !contactHref.startsWith("mailto:")) {
        try {
          const contactUrl = new URL(contactHref, url).toString();
          if (normalizeDomain(contactUrl) === normalizeDomain(url)) {
            const c2 = new AbortController();
            const t2 = setTimeout(() => c2.abort(), timeoutMs);
            const r2 = await fetchFn(contactUrl, {
              signal: c2.signal,
              headers: {
                "User-Agent": "SendFableAcquisitionBot/1.0 (+https://sendfable.com; B2B research)",
                Accept: "text/html",
              },
            });
            clearTimeout(t2);
            if (r2.ok) {
              const html2 = (await r2.text()).slice(0, 400_000);
              const a2 = analyzeHtml(html2, url);
              analysis = {
                ...analysis,
                emails: [...new Set([...analysis.emails, ...a2.emails])],
                bestEmail: a2.bestEmail || analysis.bestEmail,
                newsletterPresent: analysis.newsletterPresent || a2.newsletterPresent,
                eventsPromotionsPresent:
                  analysis.eventsPromotionsPresent || a2.eventsPromotionsPresent,
                competitorPlatform: analysis.competitorPlatform || a2.competitorPlatform,
                evidenceSnippets: [
                  ...analysis.evidenceSnippets,
                  ...a2.evidenceSnippets,
                ].slice(0, 5),
                contactPageUrl: contactUrl,
              };
            }
          }
        } catch {
          /* ignore contact follow failures */
        }
      }
    }

    return {
      ok: true,
      activeWebsite: true,
      statusCode: res.status,
      ...analysis,
    };
  } catch (err) {
    return {
      ok: false,
      activeWebsite: false,
      emails: [],
      newsletterPresent: false,
      eventsPromotionsPresent: false,
      evidenceSnippets: [],
      error: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}
