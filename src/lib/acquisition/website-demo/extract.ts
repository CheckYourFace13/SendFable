/**
 * Extract only facts that appear on the public page.
 * Prices, dates, and names that are not in the source are omitted.
 */

const MONTH =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const DATE_RE = new RegExp(
  `\\b(?:${MONTH})\\.?\\s+\\d{1,2}(?:\\s*[–-]\\s*(?:(?:${MONTH})\\.?\\s+)?\\d{1,2})?(?:,\\s*\\d{4})?`,
  "i"
);
const PRICE_RE = /\$\d{1,4}(?:\.\d{2})?/;
const TIME_RE =
  /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?:\s*(?:to|–|-)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))?\b/i;
const MARKETING_RE =
  /\b(special|specials|sale|promo|promotion|offer|event|events|class|classes|menu|ticket|tickets|season|seasonal|release|available|book|reserve|workshop|tasting|tour)\b/i;
const GENERIC_HEADING =
  /^(home|welcome|menu|contact|about|blog|news|shop|services|our story|hello|upcoming events|latest news|tickets on sale now|open year-round|the space|events|what's on|whats on|see more|learn more|news & events)$/i;

const BAD_IMAGE =
  /(pixel|spacer|tracking|beacon|analytics|doubleclick|googlesyndication|facebook|twitter|instagram|tiktok|logo|icon|sprite|badge|avatar|emoji)/i;

export type MarketingFacts = {
  headline: string;
  description: string | null;
  dateText: string | null;
  timeText: string | null;
  priceText: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  ctaLabel: string;
  ctaHref: string;
  pageUrl: string;
};

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNavDump(text: string): boolean {
  const t = text.trim();
  if (!/[.!?]/.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  const navWords = words.filter((w) =>
    /^(home|about|contact|events|menu|news|faqs|blog|shop|services|space|artists|concessions)$/i.test(
      w.replace(/[^a-z]/gi, "")
    )
  );
  return words.length >= 8 && navWords.length / words.length > 0.34;
}

function protectAbbreviations(text: string): string {
  return text.replace(
    /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|Mr|Mrs|Ms|Dr|St|a|p)\./gi,
    (m) => m.replace(".", "∯")
  );
}

function restoreAbbreviations(text: string): string {
  return text.replace(/∯/g, ".");
}

export function firstProseSentence(text: string): string | null {
  const parts = protectAbbreviations(text.replace(/\s+/g, " "))
    .split(/(?<=[.!?])\s+/)
    .map((s) => restoreAbbreviations(s.trim()))
    .filter(Boolean);
  const kept: string[] = [];
  for (const sentence of parts) {
    if (sentence.length < 40 || !/[.!?]$/.test(sentence) || isNavDump(sentence)) continue;
    kept.push(sentence);
    if (kept.length === 2) break;
  }
  if (!kept.length) return null;
  const joined = kept.join(" ");
  return joined.length > 320 ? joined.slice(0, 317).replace(/\s+\S*$/, "") + "." : joined;
}

type Section = { heading: string; body: string; slice: string };

function sectionsFrom(html: string): Section[] {
  const region = contentHtml(html);
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const matches = [...region.matchAll(re)];
  const sections: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const heading = stripTags(matches[i][2] || "");
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? region.length) : region.length;
    const slice = region.slice(start, end);
    sections.push({ heading, body: stripTags(slice), slice });
  }
  return sections;
}

function headingScore(heading: string): number {
  if (!heading || GENERIC_HEADING.test(heading) || /^welcome to\b/i.test(heading)) return -20;
  if (heading.length < 4 || heading.length > 90) return -20;
  let score = Math.min(heading.length, 70) / 12;
  if (heading.split(/\s+/).length >= 3) score += 2;
  if (MARKETING_RE.test(heading)) score += 1;
  return score;
}

export type ImageCandidate = {
  src: string;
  alt: string;
  width: number;
  height: number;
  href?: string;
};

function contentHtml(html: string): string {
  return html
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
}

export function imageCandidates(html: string, pageUrl: string): ImageCandidate[] {
  const region = contentHtml(html);
  const out: ImageCandidate[] = [];
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const tag = m[0];
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || src.startsWith("data:")) continue;
    let abs: URL;
    try {
      abs = new URL(src, pageUrl);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || "";
    const width = Number(/width\s*=\s*["']?(\d+)/i.exec(tag)?.[1] || 0);
    const height = Number(/height\s*=\s*["']?(\d+)/i.exec(tag)?.[1] || 0);
    if ((width > 0 && width <= 48) || (height > 0 && height <= 48)) continue;
    if (width === 1 || height === 1) continue;
    const blob = `${abs.pathname} ${alt}`.toLowerCase();
    if (BAD_IMAGE.test(blob)) continue;
    if (/\.svg($|\?)/i.test(abs.pathname)) continue;
    if (/\.gif($|\?)/i.test(abs.pathname) && (width > 0 && width < 80)) continue;
    out.push({ src: abs.toString(), alt: stripTags(alt), width, height });
  }
  return out;
}

export function sameSiteImage(src: string, pageUrl: string): boolean {
  try {
    const img = new URL(src);
    const page = new URL(pageUrl);
    const ih = img.hostname.replace(/^www\./, "");
    const ph = page.hostname.replace(/^www\./, "");
    return ih === ph || ih.endsWith(`.${ph}`);
  } catch {
    return false;
  }
}

export function pickImage(
  candidates: ImageCandidate[],
  headline: string,
  pageUrl: string,
  minScore = 5
): ImageCandidate | null {
  const words = headline
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  let best: { img: ImageCandidate; score: number } | null = null;
  for (const img of candidates) {
    if (!sameSiteImage(img.src, pageUrl)) continue;
    let score = 1;
    if (img.width >= 300) score += 2;
    const blob = `${img.alt} ${img.src}`.toLowerCase();
    if (words.some((w) => blob.includes(w))) score += 5;
    if (!best || score > best.score) best = { img, score };
  }
  if (!best || best.score < minScore) return null;
  return best.img;
}

const IMAGE_STOP = new Set([
  "the", "and", "vs", "for", "with", "from", "your", "this", "that", "into",
  "over", "under", "at", "of", "to", "in", "on", "by", "or", "our", "its",
  "but", "not", "are", "was", "per", "poster", "image", "photo", "picture",
  "graphic", "hero", "banner", "img", "copy", "www", "uploads", "content",
]);

export function distinctiveTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length <= 3 || IMAGE_STOP.has(raw) || /^\d+$/.test(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

function resolveUrl(raw: string, pageUrl: string): string | null {
  if (!raw || raw.startsWith("data:")) return null;
  try {
    const abs = new URL(raw, pageUrl);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
    return abs.toString();
  } catch {
    return null;
  }
}

function acceptableImageUrl(src: string, alt: string, width: number, height: number): boolean {
  if ((width > 0 && width <= 48) || (height > 0 && height <= 48)) return false;
  if (width === 1 || height === 1) return false;
  let path = "";
  try {
    path = new URL(src).pathname;
  } catch {
    return false;
  }
  if (BAD_IMAGE.test(`${path} ${alt}`.toLowerCase())) return false;
  if (/\.svg($|\?)/i.test(path)) return false;
  if (/\.gif($|\?)/i.test(path) && width > 0 && width < 80) return false;
  return true;
}

function urlsFromImgTag(tag: string): string[] {
  const urls: string[] = [];
  const lazy = /data-(?:lazy-src|src|original)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  const src = /(?:^|\s)src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  const srcset = /srcset\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  if (lazy) urls.push(lazy);
  if (src) urls.push(src);
  if (srcset) {
    for (const part of srcset.split(",")) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.push(u);
    }
  }
  return urls;
}

function nearestAnchorHref(html: string, index: number): string {
  const before = html.slice(Math.max(0, index - 900), index);
  const close = before.lastIndexOf("</a>");
  const open = Math.max(before.lastIndexOf("<a "), before.lastIndexOf("<a\n"));
  if (open < 0 || open < close) return "";
  return /href\s*=\s*["']([^"']+)["']/i.exec(before.slice(open))?.[1] || "";
}

/** Images in a fragment: img, lazy attrs, srcset, and CSS background-image. */
export function visualCandidates(html: string, pageUrl: string): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  const seen = new Set<string>();
  const push = (raw: string, alt: string, width: number, height: number, href: string) => {
    const src = resolveUrl(raw, pageUrl);
    if (!src || seen.has(src) || !acceptableImageUrl(src, alt, width, height)) return;
    if (!sameSiteImage(src, pageUrl)) return;
    seen.add(src);
    const absHref = href ? resolveUrl(href, pageUrl) || "" : "";
    out.push({ src, alt: stripTags(alt), width, height, href: absHref || undefined });
  };

  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || "";
    const width = Number(/width\s*=\s*["']?(\d+)/i.exec(tag)?.[1] || 0);
    const height = Number(/height\s*=\s*["']?(\d+)/i.exec(tag)?.[1] || 0);
    const href = nearestAnchorHref(html, m.index ?? 0);
    for (const raw of urlsFromImgTag(tag)) push(raw, alt, width, height, href);
  }

  const bgRe = /background-image\s*:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  while ((m = bgRe.exec(html))) {
    push(m[1], "", 0, 0, nearestAnchorHref(html, m.index ?? 0));
  }
  return out;
}

const WRAP_TAGS = new Set(["div", "section", "article", "li", "figure", "main", "aside"]);

function elementSpans(html: string): Array<{ start: number; end: number }> {
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  const stack: Array<{ tag: string; start: number }> = [];
  const spans: Array<{ start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    const tag = (m[1] || "").toLowerCase();
    if (!WRAP_TAGS.has(tag)) continue;
    if (/\/\s*>$/.test(m[0])) continue;
    if (m[0][1] === "/") {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag !== tag) continue;
        const open = stack[i];
        stack.length = i;
        spans.push({ start: open.start, end: m.index + m[0].length });
        break;
      }
      continue;
    }
    stack.push({ tag, start: m.index });
  }
  return spans;
}

function headingAt(html: string, heading: string): number {
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (stripTags(m[2] || "") === heading) return m.index ?? -1;
  }
  return -1;
}

function realHeadingCount(slice: string, businessName?: string | null): number {
  const biz = (businessName || "").trim().toLowerCase();
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    const text = stripTags(m[2] || "");
    if (biz && text.toLowerCase() === biz) continue;
    if (headingScore(text) < 1) continue;
    n++;
  }
  return n;
}

function cardHtml(
  html: string,
  heading: string,
  pageUrl: string,
  businessName?: string | null
): string | null {
  const at = headingAt(html, heading);
  if (at < 0) return null;
  const containing = elementSpans(html)
    .filter((span) => span.start < at && span.end > at)
    .sort((a, b) => a.end - a.start - (b.end - b.start));
  for (const span of containing) {
    const slice = html.slice(span.start, span.end);
    if (realHeadingCount(slice, businessName) !== 1) continue;
    if (!visualCandidates(slice, pageUrl).length) continue;
    return slice;
  }
  return null;
}

function relevanceScore(img: ImageCandidate, tokens: string[]): number {
  if (!tokens.length) return 0;
  let score = 0;
  const alt = img.alt.toLowerCase();
  const file = img.src.toLowerCase();
  const href = (img.href || "").toLowerCase();
  if (tokens.some((t) => alt.includes(t))) score += 8;
  if (tokens.some((t) => file.includes(t))) score += 8;
  if (tokens.some((t) => href.includes(t))) score += 8;
  return score;
}

function conflictsWithOtherEvent(img: ImageCandidate, otherTokens: string[], mine: string[]): boolean {
  if (!otherTokens.length) return false;
  const blob = `${img.alt} ${img.src} ${img.href || ""}`.toLowerCase();
  const hitsOther = otherTokens.some((t) => blob.includes(t));
  const hitsMine = mine.some((t) => blob.includes(t));
  return hitsOther && !hitsMine;
}

function otherEventTokens(html: string, heading: string, businessName?: string | null): string[] {
  const biz = (businessName || "").trim().toLowerCase();
  const tokens = new Set<string>();
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTags(m[2] || "");
    if (text === heading) continue;
    if (biz && text.toLowerCase() === biz) continue;
    if (headingScore(text) < 1) continue;
    for (const token of distinctiveTokens(text)) tokens.add(token);
  }
  return [...tokens];
}

/**
 * An image is usable only when it belongs to this event's card.
 * Another event's artwork on the same page is rejected.
 * Low confidence returns null — a campaign with no image is preferred.
 */
export function selectCardImage(
  html: string,
  heading: string,
  pageUrl: string,
  businessName?: string | null
): ImageCandidate | null {
  const region = contentHtml(html);
  const slice = cardHtml(region, heading, pageUrl, businessName);
  if (!slice) return null;
  const images = visualCandidates(slice, pageUrl);
  if (!images.length) return null;
  const mine = distinctiveTokens(heading);
  const others = otherEventTokens(region, heading, businessName);
  const clean = images.filter((img) => !conflictsWithOtherEvent(img, others, mine));
  if (!clean.length) return null;
  if (images.length === 1) return clean[0];
  const ranked = clean
    .map((img) => ({ img, score: relevanceScore(img, mine) }))
    .filter((row) => row.score >= 8)
    .sort((a, b) => b.score - a.score || b.img.width - a.img.width);
  return ranked[0]?.img ?? null;
}

const CTA_PREFER =
  /\b(order|book|reserve|tickets|get tickets|view|shop|see menu|rsvp|register|learn more|see details|buy)\b/i;

export function pickCta(html: string, pageUrl: string): { label: string; href: string } {
  const region = contentHtml(html);
  const re = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const label = stripTags(m[2]);
    if (label.length < 3 || label.length > 40) continue;
    if (!CTA_PREFER.test(label)) continue;
    try {
      const href = new URL(m[1], pageUrl);
      if (href.protocol !== "http:" && href.protocol !== "https:") continue;
      if (!sameSiteImage(href.toString(), pageUrl)) continue;
      return { label, href: href.toString() };
    } catch {
      continue;
    }
  }
  return { label: "See the details", href: pageUrl };
}

export function extractMarketingFacts(
  html: string,
  pageUrl: string,
  businessName?: string | null
): MarketingFacts | null {
  const biz = (businessName || "").trim().toLowerCase();
  let best: { section: Section; score: number; sentence: string | null } | null = null;
  for (const section of sectionsFrom(html)) {
    if (biz && section.heading.trim().toLowerCase() === biz) continue;
    const hScore = headingScore(section.heading);
    if (hScore < 1) continue;
    const sentence = firstProseSentence(section.body);
    const dateText = section.body.match(DATE_RE)?.[0] ?? null;
    const priceText = section.body.match(PRICE_RE)?.[0] ?? null;
    const offerish = Boolean(
      dateText || priceText || MARKETING_RE.test(`${section.heading} ${sentence || ""}`)
    );
    if (!sentence || !offerish) continue;
    const score = hScore + (sentence ? 3 : 0) + (dateText ? 2 : 0) + (priceText ? 2 : 0);
    if (!best || score > best.score) best = { section, score, sentence };
  }
  if (!best) return null;

  const { section, sentence } = best;
  const dateText = section.body.match(DATE_RE)?.[0] ?? null;
  const priceText = section.body.match(PRICE_RE)?.[0] ?? null;
  const timeText = section.body.match(TIME_RE)?.[0] ?? null;
  if (!sentence && !dateText && !priceText) return null;

  const image = selectCardImage(html, section.heading, pageUrl, businessName);
  const linked = pickCta(section.slice, pageUrl);
  const cta =
    linked.href !== pageUrl || linked.label !== "See the details"
      ? linked
      : pickCta(html, pageUrl);

  return {
    headline: section.heading,
    description: sentence,
    dateText,
    timeText,
    priceText,
    imageUrl: image?.src ?? null,
    imageAlt: image?.alt || section.heading,
    ctaLabel: cta.label,
    ctaHref: cta.href,
    pageUrl,
  };
}

export function campaignSubjectFromHeadline(headline: string): string {
  const h = headline.trim().replace(/\s+/g, " ");
  if (/[.!?]$/.test(h)) return h.slice(0, 90);
  if (h.length <= 46) return `${h} is here`;
  return h.slice(0, 78);
}
