export type EmailBrand = {
  businessName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontLabel: "Modern" | "Classic";
  buttonStyle: "rounded" | "square";
  buttonLabel: "Rounded" | "Square";
};

const MODERN_FONT = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const CLASSIC_FONT = "Georgia,'Times New Roman',Times,serif";

const FALLBACK: EmailBrand = {
  businessName: null,
  logoUrl: null,
  primaryColor: "#111827",
  accentColor: "#1f2937",
  backgroundColor: "#f8fafc",
  textColor: "#374151",
  fontFamily: MODERN_FONT,
  fontLabel: "Modern",
  buttonStyle: "rounded",
  buttonLabel: "Rounded",
};

function meta(html: string, key: string): string | null {
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

export function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let hex = raw.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(hex);
  if (short) {
    const [r, g, b] = short[1].split("");
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function isNeutral(hex: string): boolean {
  const l = luminance(hex);
  return l > 0.9 || l < 0.12;
}

function hexes(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = normalizeHex(`#${match[1]}`);
    if (hex && !found.includes(hex)) found.push(hex);
  }
  return found;
}

function logoFrom(html: string, pageUrl: string): string | null {
  const apple = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]*>/i
  )?.[0];
  const appleHref = apple?.match(/href=["']([^"']+)["']/i)?.[1];
  const appleUrl = absUrl(pageUrl, appleHref || null);
  if (appleUrl) return appleUrl;

  const icons = html.matchAll(
    /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*>/gi
  );
  for (const icon of icons) {
    const href = icon[0].match(/href=["']([^"']+)["']/i)?.[1] || "";
    if (/favicon\.ico/i.test(href)) continue;
    const url = absUrl(pageUrl, href);
    if (url) return url;
  }

  const og = absUrl(pageUrl, meta(html, "og:image"));
  if (!og) return null;
  try {
    const imageHost = new URL(og).hostname.replace(/^www\./, "");
    const pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
    if (imageHost === pageHost || imageHost.endsWith(`.${pageHost}`)) return og;
  } catch {
    return null;
  }
  return null;
}

/** Email-safe brand read from a public page. Missing pieces stay simple defaults. */
export function extractEmailBrand(
  html: string,
  pageUrl: string,
  businessName?: string | null
): EmailBrand {
  const colors = hexes(html);
  const theme = normalizeHex(meta(html, "theme-color"));
  const colored = colors.filter((hex) => !isNeutral(hex));
  const primary =
    (theme && !isNeutral(theme) ? theme : null) || colored[0] || FALLBACK.primaryColor;
  const accent = colored.find((hex) => hex !== primary) || primary;
  const light = colors.find((hex) => luminance(hex) > 0.9);
  const title =
    meta(html, "og:site_name") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/[|\-–—]/)[0]?.trim() ||
    null;
  const serif = /font-family:[^;}{]{0,80}serif/i.test(html);
  const square = /<(?:button|a)\b[^>]*style=["'][^"']*border-radius:\s*0(?:px)?/i.test(html);
  return {
    businessName: (businessName || title || "").trim() || null,
    logoUrl: logoFrom(html, pageUrl),
    primaryColor: primary,
    accentColor: accent,
    backgroundColor: light || FALLBACK.backgroundColor,
    textColor: FALLBACK.textColor,
    fontFamily: serif ? CLASSIC_FONT : MODERN_FONT,
    fontLabel: serif ? "Classic" : "Modern",
    buttonStyle: square ? "square" : "rounded",
    buttonLabel: square ? "Square" : "Rounded",
  };
}

export function fontLabelForStack(stack: string | null | undefined): "Modern" | "Classic" {
  return /georgia|times/i.test(stack || "") ? "Classic" : "Modern";
}

export function fontStackForLabel(label: "Modern" | "Classic"): string {
  return label === "Classic" ? CLASSIC_FONT : MODERN_FONT;
}
