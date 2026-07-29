/**
 * Crawl public SendFable routes for stale launch wording + basic status checks.
 * Usage: npx tsx scripts/crawl-public-launch.ts [baseUrl]
 */
const BASE = process.argv[2] || process.env.APP_URL || "https://sendfable.com";

const ROUTES = [
  "/",
  "/pricing",
  "/features",
  "/resources",
  "/templates",
  "/deliverability",
  "/integrations",
  "/security",
  "/status",
  "/contact",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/refund-policy",
  "/changelog",
  "/migrate",
  "/migrate/mailchimp",
  "/email-marketing-for-small-business",
  "/cheap-email-marketing",
  "/compare/mailchimp",
  "/vs/mailchimp",
  "/solutions/restaurants",
  "/early-access",
  "/robots.txt",
  "/sitemap.xml",
];

const FORBIDDEN = [
  /coming soon/i,
  /being written now/i,
  /request early access/i,
  /join early access/i,
  /join the waitlist/i,
  /BullMQ/i,
];

async function main() {
  const failures: string[] = [];
  for (const path of ROUTES) {
    const url = `${BASE.replace(/\/$/, "")}${path}`;
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    const okStatus =
      path === "/early-access"
        ? res.url.includes("/signup") || res.status === 200
        : res.status === 200;
    if (!okStatus) failures.push(`${path} HTTP ${res.status} final=${res.url}`);
    if (path === "/early-access" && res.url.includes("/signup")) {
      console.log(JSON.stringify({ path, ok: true, redirectedTo: "/signup" }));
      continue;
    }
    for (const re of FORBIDDEN) {
      if (re.test(text)) failures.push(`${path} contains ${re}`);
    }
    if (/Text Entry|Text Essentials|Text Advantage|text messaging plans/i.test(text) && path === "/pricing") {
      failures.push(`${path} exposes SMS pricing while SMS should stay dark`);
    }
    // Pricing sanity on homepage/pricing
    if (path === "/pricing" || path === "/") {
      for (const need of ["$12", "$29", "$69", "$99", "Pro Plus"]) {
        if (!text.includes(need)) failures.push(`${path} missing pricing token ${need}`);
      }
      for (const stale of ["$9/mo", "$19/mo", "$49/mo"]) {
        if (text.includes(stale)) failures.push(`${path} has stale price ${stale}`);
      }
    }
    console.log(JSON.stringify({ path, status: res.status, ok: okStatus && !failures.some((f) => f.startsWith(path)) }));
  }
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, base: BASE, routes: ROUTES.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
