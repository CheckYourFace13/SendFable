import { fetchPublicText } from "@/lib/ssrf";

export interface BrandSuggestions {
  title: string | null;
  description: string | null;
  logoCandidates: string[];
  primaryColor: string | null;
  secondaryColor: string | null;
  socialLinks: Array<{ network: string; url: string }>;
  sourceUrl: string;
}

function absUrl(base: string, href: string | undefined | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

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

const SOCIAL: Array<{ network: string; pattern: RegExp }> = [
  { network: "Facebook", pattern: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi },
  { network: "Instagram", pattern: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/gi },
  { network: "Twitter", pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/gi },
  { network: "LinkedIn", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/gi },
  { network: "YouTube", pattern: /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/gi },
];

/** Extract brand suggestions from a public website. Values are suggestions only. */
export async function importBrandFromWebsite(websiteUrl: string): Promise<BrandSuggestions> {
  const { url, body } = await fetchPublicText(websiteUrl);
  const title =
    metaContent(body, "og:title") ||
    body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    null;
  const description =
    metaContent(body, "og:description") || metaContent(body, "description") || null;

  const logos = new Set<string>();
  const ogImage = absUrl(url, metaContent(body, "og:image"));
  if (ogImage) logos.add(ogImage);
  const iconMatches = body.matchAll(
    /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>/gi
  );
  for (const m of iconMatches) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    const abs = absUrl(url, href);
    if (abs) logos.add(abs);
  }
  // Common favicon fallback
  try {
    logos.add(new URL("/favicon.ico", url).toString());
  } catch {
    /* ignore */
  }

  const theme =
    body.match(/theme-color["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    body.match(/content=["']([^"']+)["'][^>]+name=["']theme-color["']/i)?.[1] ||
    null;
  const hexColors = [...body.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1]}`);
  const primaryColor = theme?.startsWith("#") ? theme : hexColors[0] || null;
  const secondaryColor = hexColors.find((c) => c.toLowerCase() !== primaryColor?.toLowerCase()) || null;

  const socialLinks: BrandSuggestions["socialLinks"] = [];
  const seen = new Set<string>();
  for (const s of SOCIAL) {
    const match = body.match(s.pattern);
    if (match?.[0] && !seen.has(s.network)) {
      seen.add(s.network);
      socialLinks.push({ network: s.network, url: match[0].replace(/["'>].*$/, "") });
    }
  }

  return {
    title: title ? title.slice(0, 120) : null,
    description: description ? description.slice(0, 500) : null,
    logoCandidates: [...logos].slice(0, 8),
    primaryColor,
    secondaryColor,
    socialLinks,
    sourceUrl: url,
  };
}
