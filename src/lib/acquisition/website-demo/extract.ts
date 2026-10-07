/**
 * Extract only facts that appear on the public page.
 * Prices, dates, and names that are not in the source are omitted.
 */

const MONTH =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const DATE_RE = new RegExp(
  `\\b(?:${MONTH})\\s+\\d{1,2}(?:\\s*[–-]\\s*(?:(?:${MONTH})\\s+)?\\d{1,2})?(?:,\\s*\\d{4})?`,
  "i"
);
const PRICE_RE = /\$\d{1,4}(?:\.\d{2})?/;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i;
const MARKETING_RE =
  /\b(special|specials|sale|promo|promotion|offer|event|events|class|classes|menu|ticket|tickets|season|seasonal|release|available|book|reserve|workshop|tasting|tour)\b/i;
const GENERIC_HEADING =
  /^(home|welcome|menu|contact|about|blog|news|shop|services|our story|hello)$/i;

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

function headings(html: string): string[] {
  const out: string[] = [];
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTags(m[2]);
    if (text.length >= 8 && text.length <= 90 && !GENERIC_HEADING.test(text)) out.push(text);
  }
  return out;
}

function paragraphs(html: string): string[] {
  const out: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTags(m[1]);
    if (text.length >= 40) out.push(text);
  }
  return out;
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

export function pickImage(candidates: ImageCandidate[], headline: string, pageUrl: string): ImageCandidate | null {
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
  return best?.img ?? null;
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
  const heads = headings(html).filter((h) => {
    if (!businessName) return true;
    return h.trim().toLowerCase() !== businessName.trim().toLowerCase();
  });
  const paras = paragraphs(html);
  const visible = `${heads.join("\n")}\n${paras.join("\n")}\n${stripTags(contentHtml(html))}`;

  const headline =
    heads.find((h) => MARKETING_RE.test(h)) ||
    heads.find((h) => h.length >= 12) ||
    null;
  if (!headline) return null;
  if (!visible.toLowerCase().includes(headline.toLowerCase())) return null;

  const dateText = visible.match(DATE_RE)?.[0] ?? null;
  const priceText = visible.match(PRICE_RE)?.[0] ?? null;
  const timeText = visible.match(TIME_RE)?.[0] ?? null;
  const description =
    paras.find((p) => DATE_RE.test(p) || PRICE_RE.test(p) || MARKETING_RE.test(p)) || null;

  const useful =
    Boolean(dateText || priceText) ||
    Boolean(description && description.length >= 40 && MARKETING_RE.test(`${headline} ${description}`));
  if (!useful) return null;

  const image = pickImage(imageCandidates(html, pageUrl), headline, pageUrl);
  const cta = pickCta(html, pageUrl);

  return {
    headline,
    description: description ? description.slice(0, 320) : null,
    dateText,
    timeText,
    priceText,
    imageUrl: image?.src ?? null,
    imageAlt: image?.alt || headline,
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
