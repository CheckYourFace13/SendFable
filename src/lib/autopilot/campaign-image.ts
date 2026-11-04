/**
 * Select a story-relevant image for a Scribe campaign.
 * Prefer og/twitter/featured/hero/in-content that matches the selected story.
 * Never force an unrelated image.
 */

import {
  pickImage,
  visualCandidates,
  sameSiteImage,
  distinctiveTokens,
  type ImageCandidate,
} from "@/lib/acquisition/website-demo/extract";

export type ScribeImageSourceType =
  | "og:image"
  | "twitter:image"
  | "featured"
  | "hero"
  | "in_content"
  | "none";

export type ScribeImageSelection = {
  imageUrl: string | null;
  imageAlt: string | null;
  imageSourceType: ScribeImageSourceType;
  imageSourcePageUrl: string;
};

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`,
    "i"
  );
  return html.match(re)?.[1] || html.match(re2)?.[1] || null;
}

function absUrl(base: string, href: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const BAD =
  /\b(logo|favicon|icon|sprite|pixel|tracking|cookie|badge|avatar|spinner|placeholder|1x1|spacer)\b/i;

const GENERIC_OG_PATH = /\/(opengraph-image|twitter-image|og(-image)?|default[-_]?og|share[-_]?card)(\.\w+)?(\?|$)/i;

function looksRelevant(url: string, alt: string, title: string, opts?: { meta?: boolean }): boolean {
  if (BAD.test(`${url} ${alt}`)) return false;
  if (opts?.meta && GENERIC_OG_PATH.test(url)) return false;
  const tokens = distinctiveTokens(title);
  if (!tokens.length) return false;
  const blob = `${url} ${alt}`.toLowerCase();
  const hits = tokens.filter((t) => blob.includes(t)).length;
  // Meta images need a stronger match so brand-wide OG art is not forced onto every story.
  return opts?.meta ? hits >= 2 : hits >= 1;
}

function metaCandidate(
  html: string,
  pageUrl: string,
  key: string,
  type: ScribeImageSourceType
): { src: string; alt: string; type: ScribeImageSourceType } | null {
  const raw = metaContent(html, key);
  const src = absUrl(pageUrl, raw);
  if (!src || !sameSiteImage(src, pageUrl)) return null;
  if (BAD.test(src)) return null;
  return { src, alt: "", type };
}

/**
 * Choose an image clearly relevant to `title` from the source page.
 * Returns NO IMAGE (null url) when nothing is clearly relevant.
 */
export function selectScribeCampaignImage(opts: {
  html: string;
  pageUrl: string;
  title: string;
  body?: string;
}): ScribeImageSelection {
  const pageUrl = opts.pageUrl;
  const title = opts.title;
  const empty: ScribeImageSelection = {
    imageUrl: null,
    imageAlt: null,
    imageSourceType: "none",
    imageSourcePageUrl: pageUrl,
  };

  const metaOpts: Array<{ key: string; type: ScribeImageSourceType }> = [
    { key: "og:image", type: "og:image" },
    { key: "twitter:image", type: "twitter:image" },
    { key: "twitter:image:src", type: "twitter:image" },
  ];

  for (const m of metaOpts) {
    const c = metaCandidate(opts.html, pageUrl, m.key, m.type);
    if (c && looksRelevant(c.src, c.alt || title, title, { meta: true })) {
      return {
        imageUrl: c.src,
        imageAlt: title,
        imageSourceType: c.type,
        imageSourcePageUrl: pageUrl,
      };
    }
  }

  // Featured / hero-ish: first large same-site image near the title heading
  const headingRe = new RegExp(
    `<h([1-3])[^>]*>\\s*${escapeRegExp(title).slice(0, 80)}[\\s\\S]{0,40}?</h\\1>`,
    "i"
  );
  const headingMatch = opts.html.match(headingRe);
  if (headingMatch && headingMatch.index != null) {
    const slice = opts.html.slice(
      headingMatch.index,
      Math.min(opts.html.length, headingMatch.index + 2500)
    );
    const locals = visualCandidates(slice, pageUrl);
    const tokens = distinctiveTokens(`${title} ${opts.body || ""}`);
    const ranked = locals
      .map((img) => {
        let score = 0;
        const blob = `${img.alt} ${img.src}`.toLowerCase();
        if (tokens.some((t) => blob.includes(t))) score += 10;
        if (img.width >= 400) score += 3;
        if (BAD.test(blob)) score -= 50;
        return { img, score };
      })
      .filter((r) => r.score >= 10)
      .sort((a, b) => b.score - a.score);
    if (ranked[0]) {
      return {
        imageUrl: ranked[0].img.src,
        imageAlt: ranked[0].img.alt || title,
        imageSourceType: "hero",
        imageSourcePageUrl: pageUrl,
      };
    }
  }

  // In-content pickImage with a higher relevance bar
  const candidates: ImageCandidate[] = visualCandidates(opts.html, pageUrl);
  const picked = pickImage(candidates, title, pageUrl, 8);
  if (picked && looksRelevant(picked.src, picked.alt, title)) {
    return {
      imageUrl: picked.src,
      imageAlt: picked.alt || title,
      imageSourceType: "in_content",
      imageSourcePageUrl: pageUrl,
    };
  }

  // Site-wide og:image alone (no title token match) is rejected — often a brand graphic
  return empty;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function confirmScribeImage(
  selection: ScribeImageSelection,
  confirm: (url: string, pageUrl: string) => Promise<"ok" | "reject" | "unknown">
): Promise<ScribeImageSelection> {
  if (!selection.imageUrl) return selection;
  const check = await confirm(selection.imageUrl, selection.imageSourcePageUrl);
  // Reject hard failures; keep statically filtered URLs when the live check is unknown.
  if (check === "reject") {
    return {
      imageUrl: null,
      imageAlt: null,
      imageSourceType: "none",
      imageSourcePageUrl: selection.imageSourcePageUrl,
    };
  }
  return selection;
}
