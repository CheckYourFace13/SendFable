/**
 * TheDrinkPlace weekly edition builder (SendFable-scoped).
 * Global by default; optional local section only when contact customFields.newsletterDestination is set.
 * Skips when there is not enough distinct useful content vs recent sends.
 */

export type TdpWeeklyLink = {
  href: string;
  label: string;
  kind: "guide" | "destination" | "feature";
};

export type TdpWeeklyEdition = {
  subject: string;
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  goal: "news";
  templateSlug: null;
  explanation: string;
  model: string;
  costMicros: number;
  links: TdpWeeklyLink[];
};

const GUIDES: TdpWeeklyLink[] = [
  {
    href: "https://thedrinkplace.com/guides/essential-home-bar-tools",
    label: "Essential home bar tools",
    kind: "guide",
  },
  {
    href: "https://thedrinkplace.com/guides/cocktail-glassware",
    label: "Cocktail glassware guide",
    kind: "guide",
  },
  {
    href: "https://thedrinkplace.com/guides/old-fashioned-tools-glassware",
    label: "Old Fashioned tools & glassware",
    kind: "guide",
  },
  {
    href: "https://thedrinkplace.com/guides/margarita-tools-glassware-salt",
    label: "Margarita tools, glassware & salt",
    kind: "guide",
  },
  {
    href: "https://thedrinkplace.com/guides/martini-glasses-and-tools",
    label: "Martini glasses and tools",
    kind: "guide",
  },
  {
    href: "https://thedrinkplace.com/guides/cocktail-ice-guide",
    label: "Cocktail ice guide",
    kind: "guide",
  },
];

/** Destination features — never the silent default; Chicago is one labeled option among many. */
const DESTINATION_FEATURES: TdpWeeklyLink[] = [
  {
    href: "https://thedrinkplace.com/destinations/london",
    label: "London drink destination",
    kind: "destination",
  },
  {
    href: "https://thedrinkplace.com/destinations/istanbul",
    label: "Istanbul drink destination",
    kind: "destination",
  },
  {
    href: "https://thedrinkplace.com/chicago",
    label: "Chicago drink destination",
    kind: "destination",
  },
  {
    href: "https://thedrinkplace.com/destinations",
    label: "Browse all destinations",
    kind: "feature",
  },
  {
    href: "https://thedrinkplace.com/happy-hour",
    label: "Find happy hours",
    kind: "feature",
  },
  {
    href: "https://thedrinkplace.com/discover",
    label: "Explore drinks",
    kind: "feature",
  },
];

function weekIndex(now = new Date()): number {
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(utc / (7 * 24 * 60 * 60 * 1000));
}

function rotate<T>(items: T[], offset: number, count: number): T[] {
  if (!items.length || count <= 0) return [];
  const start = ((offset % items.length) + items.length) % items.length;
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length]!);
  }
  return out;
}

function normalizeDestination(raw?: string | null): string | null {
  const s = (raw || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "chicago" || s === "chicagoland") return "chicago";
  if (s === "london" || s === "uk" || s === "gb") return "london";
  if (s === "istanbul" || s === "i̇stanbul" || s === "turkey" || s === "türkiye" || s === "tr") {
    return "istanbul";
  }
  return s.slice(0, 40);
}

function destinationLink(code: string): TdpWeeklyLink | null {
  if (code === "chicago") {
    return { href: "https://thedrinkplace.com/chicago", label: "Your saved destination: Chicago", kind: "destination" };
  }
  if (code === "london") {
    return {
      href: "https://thedrinkplace.com/destinations/london",
      label: "Your saved destination: London",
      kind: "destination",
    };
  }
  if (code === "istanbul") {
    return {
      href: "https://thedrinkplace.com/destinations/istanbul",
      label: "Your saved destination: Istanbul",
      kind: "destination",
    };
  }
  return {
    href: "https://thedrinkplace.com/destinations",
    label: "Choose a destination",
    kind: "feature",
  };
}

/** Recent campaign link hrefs used to avoid repeating the same three links every week. */
export function selectTdpWeeklyLinks(opts: {
  now?: Date;
  newsletterDestination?: string | null;
  recentlyUsedHrefs?: string[];
}): { links: TdpWeeklyLink[]; skip: boolean; reason: string } {
  const w = weekIndex(opts.now);
  const recent = new Set((opts.recentlyUsedHrefs || []).map((h) => h.toLowerCase()));
  const guidePool = GUIDES.filter((g) => !recent.has(g.href.toLowerCase()));
  const guides = rotate(guidePool.length ? guidePool : GUIDES, w, 2);
  const destPool = DESTINATION_FEATURES.filter((d) => !recent.has(d.href.toLowerCase()));
  const dest = rotate(destPool.length ? destPool : DESTINATION_FEATURES, w + 3, 1);
  const links = [...guides, ...dest];

  const saved = normalizeDestination(opts.newsletterDestination);
  if (saved) {
    const local = destinationLink(saved);
    if (local && !links.some((l) => l.href === local.href)) {
      links.push(local);
    }
  }

  const unique = [...new Map(links.map((l) => [l.href, l])).values()];
  if (unique.length < 2) {
    return { links: [], skip: true, reason: "insufficient_useful_content" };
  }
  // Same trio as last week → skip rather than re-send identical edition
  if (
    unique.length >= 3 &&
    unique.slice(0, 3).every((l) => recent.has(l.href.toLowerCase())) &&
    recent.size >= 3
  ) {
    return { links: [], skip: true, reason: "repeat_edition" };
  }
  return { links: unique.slice(0, 4), skip: false, reason: "ok" };
}

export function buildTheDrinkPlaceWeeklyEdition(opts: {
  now?: Date;
  newsletterDestination?: string | null;
  recentlyUsedHrefs?: string[];
}): TdpWeeklyEdition | null {
  const selected = selectTdpWeeklyLinks(opts);
  if (selected.skip) return null;

  const saved = normalizeDestination(opts.newsletterDestination);
  const isGlobal = !saved;
  const list = selected.links
    .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)
    .join("");

  const intro = isGlobal
    ? `<p>This week’s drink inspiration from TheDrinkPlace — guides and destinations worth exploring. This is a global edition; coverage varies by city.</p>`
    : `<p>This week’s drink inspiration from TheDrinkPlace, including a section for your saved newsletter destination.</p>`;

  const bodyHtml =
    `<p>Hi {{first_name|there}},</p>` +
    intro +
    `<ul>${list}</ul>` +
    `<p><a href="https://thedrinkplace.com/discover">Explore drinks</a> · ` +
    `<a href="https://thedrinkplace.com/destinations">Choose a destination</a> · ` +
    `<a href="https://thedrinkplace.com/happy-hour">Find happy hours</a></p>` +
    `<p>Place pages show a source and date when we have them.</p>`;

  return {
    subject: isGlobal ? "This week on TheDrinkPlace" : `This week on TheDrinkPlace · ${saved}`,
    preheader: "Drink inspiration, guides, and destinations",
    headline: "Drink inspiration this week",
    bodyHtml,
    ctaLabel: "Explore drinks",
    ctaHref: "https://thedrinkplace.com/discover",
    goal: "news",
    templateSlug: null,
    explanation: `TDP weekly selector (${selected.reason}; ${isGlobal ? "global" : `local:${saved}`})`,
    model: "tdp-weekly-v1",
    costMicros: 0,
    links: selected.links,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
