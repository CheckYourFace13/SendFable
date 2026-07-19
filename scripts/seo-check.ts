/**
 * Validates marketing page metadata uniqueness and sitemap route coverage.
 * Run: npm run seo:check
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MARKETING_ROOT = path.join(ROOT, "src", "app", "(marketing)");

/** Marketing routes that must expose unique title + description metadata. */
const MARKETING_PAGES: Array<{ route: string; file: string }> = [
  { route: "/", file: path.join(MARKETING_ROOT, "page.tsx") },
  { route: "/pricing", file: path.join(MARKETING_ROOT, "pricing", "page.tsx") },
  { route: "/features", file: path.join(MARKETING_ROOT, "features", "page.tsx") },
  { route: "/deliverability", file: path.join(MARKETING_ROOT, "deliverability", "page.tsx") },
  { route: "/templates", file: path.join(MARKETING_ROOT, "templates", "page.tsx") },
  { route: "/migrate", file: path.join(MARKETING_ROOT, "migrate", "page.tsx") },
  { route: "/security", file: path.join(MARKETING_ROOT, "security", "page.tsx") },
  { route: "/status", file: path.join(MARKETING_ROOT, "status", "page.tsx") },
  { route: "/integrations", file: path.join(MARKETING_ROOT, "integrations", "page.tsx") },
  {
    route: "/email-marketing-guide",
    file: path.join(MARKETING_ROOT, "email-marketing-guide", "page.tsx"),
  },
  { route: "/resources", file: path.join(MARKETING_ROOT, "resources", "page.tsx") },
  { route: "/changelog", file: path.join(MARKETING_ROOT, "changelog", "page.tsx") },
  {
    route: "/cheap-email-marketing",
    file: path.join(MARKETING_ROOT, "cheap-email-marketing", "page.tsx"),
  },
  {
    route: "/email-marketing-without-gmail",
    file: path.join(MARKETING_ROOT, "email-marketing-without-gmail", "page.tsx"),
  },
  {
    route: "/alternatives/mailchimp",
    file: path.join(MARKETING_ROOT, "alternatives", "mailchimp", "page.tsx"),
  },
  { route: "/vs/mailchimp", file: path.join(MARKETING_ROOT, "vs", "mailchimp", "page.tsx") },
  {
    route: "/compare/mailchimp",
    file: path.join(MARKETING_ROOT, "compare", "mailchimp", "page.tsx"),
  },
  {
    route: "/compare/constant-contact",
    file: path.join(MARKETING_ROOT, "compare", "constant-contact", "page.tsx"),
  },
  { route: "/compare/brevo", file: path.join(MARKETING_ROOT, "compare", "brevo", "page.tsx") },
  {
    route: "/compare/mailerlite",
    file: path.join(MARKETING_ROOT, "compare", "mailerlite", "page.tsx"),
  },
  { route: "/compare/kit", file: path.join(MARKETING_ROOT, "compare", "kit", "page.tsx") },
  { route: "/compare/beehiiv", file: path.join(MARKETING_ROOT, "compare", "beehiiv", "page.tsx") },
  {
    route: "/solutions/restaurants",
    file: path.join(MARKETING_ROOT, "solutions", "restaurants", "page.tsx"),
  },
  {
    route: "/solutions/breweries",
    file: path.join(MARKETING_ROOT, "solutions", "breweries", "page.tsx"),
  },
  {
    route: "/solutions/real-estate",
    file: path.join(MARKETING_ROOT, "solutions", "real-estate", "page.tsx"),
  },
  {
    route: "/solutions/nonprofits",
    file: path.join(MARKETING_ROOT, "solutions", "nonprofits", "page.tsx"),
  },
  { route: "/solutions/retail", file: path.join(MARKETING_ROOT, "solutions", "retail", "page.tsx") },
  {
    route: "/solutions/contractors",
    file: path.join(MARKETING_ROOT, "solutions", "contractors", "page.tsx"),
  },
  { route: "/solutions/salons", file: path.join(MARKETING_ROOT, "solutions", "salons", "page.tsx") },
  {
    route: "/solutions/local-events",
    file: path.join(MARKETING_ROOT, "solutions", "local-events", "page.tsx"),
  },
  {
    route: "/solutions/professional-services",
    file: path.join(MARKETING_ROOT, "solutions", "professional-services", "page.tsx"),
  },
  { route: "/terms", file: path.join(MARKETING_ROOT, "terms", "page.tsx") },
  { route: "/privacy", file: path.join(MARKETING_ROOT, "privacy", "page.tsx") },
];

type Meta = { title?: string; description?: string };

function extractMetadata(source: string): Meta {
  const blockMatch = source.match(
    /export\s+const\s+metadata(?:\s*:\s*[^=]+)?\s*=\s*(\{[\s\S]*?\n\})/,
  );
  if (!blockMatch) return {};
  const block = blockMatch[1];
  const title =
    block.match(/title\s*:\s*["'`]([^"'`]+)["'`]/)?.[1] ??
    block.match(/title\s*:\s*\{\s*absolute\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
  const description = block.match(/description\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
  return { title, description };
}

function findDuplicates(entries: Array<{ route: string; value: string }>): string[] {
  const map = new Map<string, string[]>();
  for (const e of entries) {
    const key = e.value.trim().toLowerCase();
    const list = map.get(key) ?? [];
    list.push(e.route);
    map.set(key, list);
  }
  const issues: string[] = [];
  for (const [value, routes] of map) {
    if (routes.length > 1) {
      issues.push(`"${value}" → ${routes.join(", ")}`);
    }
  }
  return issues;
}

function routeToPageFile(route: string): string | null {
  if (route === "/feed.xml") {
    return path.join(MARKETING_ROOT, "feed.xml", "route.ts");
  }
  if (route === "/") {
    return path.join(MARKETING_ROOT, "page.tsx");
  }
  return path.join(MARKETING_ROOT, ...route.slice(1).split("/"), "page.tsx");
}

function extractSitemapPaths(source: string): string[] {
  const arrayMatch = source.match(
    /export\s+const\s+SITEMAP_PATHS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
  );
  if (!arrayMatch) {
    // Fallback: quoted paths in file
    return [...source.matchAll(/["'](\/[^"']*)["']/g)].map((m) => m[1]);
  }
  return [...arrayMatch[1].matchAll(/["'](\/[^"']*)["']/g)].map((m) => m[1]);
}

function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const metas: Array<{ route: string; title?: string; description?: string }> = [];

  for (const page of MARKETING_PAGES) {
    if (!fs.existsSync(page.file)) {
      errors.push(`Missing page file for ${page.route}: ${page.file}`);
      continue;
    }
    const source = fs.readFileSync(page.file, "utf8");
    const meta = extractMetadata(source);
    if (!meta.title) {
      errors.push(`${page.route}: missing export const metadata title`);
    }
    if (!meta.description) {
      errors.push(`${page.route}: missing export const metadata description`);
    }
    metas.push({ route: page.route, ...meta });
  }

  const titleDupes = findDuplicates(
    metas.filter((m) => m.title).map((m) => ({ route: m.route, value: m.title! })),
  );
  const descDupes = findDuplicates(
    metas.filter((m) => m.description).map((m) => ({ route: m.route, value: m.description! })),
  );
  for (const d of titleDupes) errors.push(`Duplicate title: ${d}`);
  for (const d of descDupes) errors.push(`Duplicate description: ${d}`);

  const sitemapFile = path.join(ROOT, "src", "app", "sitemap.ts");
  if (!fs.existsSync(sitemapFile)) {
    errors.push("Missing src/app/sitemap.ts");
  } else {
    const sitemapSource = fs.readFileSync(sitemapFile, "utf8");
    const paths = extractSitemapPaths(sitemapSource);
    if (paths.length === 0) {
      errors.push("Could not parse paths from sitemap.ts");
    }
    for (const route of paths) {
      const file = routeToPageFile(route);
      if (!file || !fs.existsSync(file)) {
        errors.push(`Sitemap route missing page/handler: ${route}`);
      }
    }

    const sitemapSet = new Set(paths);
    for (const page of MARKETING_PAGES) {
      if (!sitemapSet.has(page.route)) {
        warnings.push(`Marketing page not listed in sitemap: ${page.route}`);
      }
    }
  }

  console.log("SEO check");
  console.log(`Pages scanned: ${MARKETING_PAGES.length}`);
  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (errors.length) {
    console.log("\nFailures:");
    for (const e of errors) console.log(`  ✗ ${e}`);
    console.log("\nRESULT: FAIL");
    process.exit(1);
  }
  console.log("\nRESULT: PASS");
}

main();
