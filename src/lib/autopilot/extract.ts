/**
 * Normalize HTML into useful visible marketing content.
 * Strips scripts, styles, nav/footer/boilerplate where practical.
 * No external HTML parser dependency — regex + heuristics only.
 */

const STRIP_BLOCKS =
  /<(script|style|noscript|svg|iframe|template|head)[\s\S]*?<\/\1>/gi;
const STRIP_TAGS =
  /<\/?(?:nav|footer|header|aside|form|button|input|select|textarea|label|meta|link)(?:\s[^>]*)?>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<[^>]+>/g;
const WS = /[ \t\f\v]+/g;
const MULTI_NL = /\n{3,}/g;

/** Boilerplate lines to drop from normalized text */
const BOILERPLATE =
  /^(cookie|privacy|terms|copyright|all rights reserved|subscribe to our newsletter|follow us|menu|skip to|sign in|log in|cart|©|\(c\)|powered by)/i;

export function htmlToVisibleText(html: string): string {
  let s = html.replace(COMMENT, " ").replace(STRIP_BLOCKS, " ").replace(STRIP_TAGS, "\n");
  // Prefer main/article content when present
  const main = s.match(/<(?:main|article)(?:\s[^>]*)?>([\s\S]*?)<\/(?:main|article)>/i);
  if (main?.[1] && main[1].replace(TAG, "").trim().length > 80) {
    s = main[1];
  }
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr|section)>/gi, "\n")
    .replace(TAG, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : " ";
    });

  const lines = s
    .split(/\r?\n/)
    .map((l) => l.replace(WS, " ").trim())
    .filter((l) => l.length > 1 && !BOILERPLATE.test(l));

  return lines.join("\n").replace(MULTI_NL, "\n\n").trim();
}

/** Soft normalize for hashing: collapse whitespace, drop years-only noise lines */
export function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b20\d{2}\b/g, "") // copyright years
    .replace(/\b(updated|last updated|posted)\s*[:\-]?\s*\w{0,12}\s*\d{0,2},?\s*\d{0,4}/gi, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function extractHeadings(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 8 && l.length <= 120 && !/[.!?]$/.test(l))
    .slice(0, 12);
}
