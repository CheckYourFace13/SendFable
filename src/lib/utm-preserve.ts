const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Copy campaign parameters onto a signup (or other) href. Drops everything else. */
export function appendUtmParams(href: string, search?: string | null): string {
  if (!search) return href;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const from = new URLSearchParams(raw);
  const keep = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const v = from.get(key);
    if (v) keep.set(key, v);
  }
  if (![...keep.keys()].length) return href;
  const base = href.startsWith("http")
    ? href
    : `https://sendfable.com${href.startsWith("/") ? href : `/${href}`}`;
  const u = new URL(base);
  keep.forEach((v, k) => u.searchParams.set(k, v));
  if (href.startsWith("http")) return u.toString();
  return `${u.pathname}${u.search}`;
}
