/**
 * Find one public marketing page for a prospect website.
 * Strict request cap. No authenticated, legal, or contact pages.
 * The fetcher is injected so tests never hit the network.
 * Production fetches go through fetchPublicText (SSRF-checked).
 */

export const MAX_DEMO_PAGES = 4;

const PATH_HINTS = [
  "/specials",
  "/events",
  "/promotions",
  "/menu",
  "/news",
  "/offers",
  "/classes",
  "/products",
  "/listings",
  "/services",
];

const GOOD_PATH =
  /(special|event|promo|menu|news|blog|product|offer|class|listing|service|season|sale|whats-on|whatson)/i;
const BAD_PATH =
  /(privacy|terms|legal|contact|login|signin|sign-in|cart|account|wp-admin|cookie|disclaimer|unsubscribe|cdn-cgi|wp-login|password|checkout)/i;

export type FetchedPage = { url: string; body: string };

export type PageFetcher = (url: string) => Promise<FetchedPage | null>;

export function isBlockedDiscoveryUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  if (url.username || url.password) return true;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return true;
  }
  if (BAD_PATH.test(url.pathname)) return true;
  return false;
}

export function pathHintScore(pathname: string): number {
  if (BAD_PATH.test(pathname)) return -100;
  let score = 0;
  if (GOOD_PATH.test(pathname)) score += 5;
  if (PATH_HINTS.some((p) => pathname.toLowerCase().includes(p.slice(1)))) score += 3;
  return score;
}

export function sameHost(a: URL, b: URL): boolean {
  const ah = a.hostname.replace(/^www\./, "");
  const bh = b.hostname.replace(/^www\./, "");
  return ah === bh;
}

/** Links on the homepage that look like marketing pages on the same host. */
export function marketingLinksFromHtml(html: string, base: URL): string[] {
  const found: { url: string; score: number }[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let next: URL;
    try {
      next = new URL(m[1], base);
    } catch {
      continue;
    }
    if (!sameHost(next, base)) continue;
    if (isBlockedDiscoveryUrl(next.toString())) continue;
    const score = pathHintScore(next.pathname);
    if (score <= 0) continue;
    next.hash = "";
    const key = next.toString().replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ url: next.toString(), score });
  }
  found.sort((a, b) => b.score - a.score);
  return found.map((f) => f.url);
}

export function candidateUrls(website: string, homepageHtml: string | null): string[] {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return [];
  }
  if (isBlockedDiscoveryUrl(base.toString())) return [];
  const urls: string[] = [base.toString()];
  const hinted = PATH_HINTS.map((p) => new URL(p, base).toString());
  const fromPage = homepageHtml ? marketingLinksFromHtml(homepageHtml, base) : [];
  for (const u of [...fromPage, ...hinted]) {
    if (urls.length >= MAX_DEMO_PAGES) break;
    const key = u.replace(/\/$/, "");
    if (urls.some((x) => x.replace(/\/$/, "") === key)) continue;
    if (isBlockedDiscoveryUrl(u)) continue;
    urls.push(u);
  }
  return urls.slice(0, MAX_DEMO_PAGES);
}

export async function fetchCandidatePages(
  website: string,
  fetchPage: PageFetcher
): Promise<FetchedPage[]> {
  if (isBlockedDiscoveryUrl(website)) return [];
  const home = await fetchPage(website);
  const urls = candidateUrls(website, home?.body ?? null);
  const pages: FetchedPage[] = [];
  for (const url of urls) {
    if (pages.length >= MAX_DEMO_PAGES) break;
    if (home && url.replace(/\/$/, "") === website.replace(/\/$/, "")) {
      pages.push(home);
      continue;
    }
    const page = await fetchPage(url);
    if (page?.body) pages.push(page);
  }
  return pages;
}
