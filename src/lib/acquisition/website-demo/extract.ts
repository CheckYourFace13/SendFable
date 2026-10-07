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

  const inSection = imageCandidates(section.slice, pageUrl).filter((img) =>
    sameSiteImage(img.src, pageUrl)
  );
  const image =
    inSection[0] ||
    pickImage(imageCandidates(html, pageUrl), section.heading, pageUrl);
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
