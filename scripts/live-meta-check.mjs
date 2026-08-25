#!/usr/bin/env node
/** Live metadata / host / SMS-dark spot checks for launch cert. */
const BASE = "https://sendfable.com";

async function get(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, { redirect: "manual", ...opts });
  const ct = res.headers.get("content-type") || "";
  const text = ct.includes("text") || ct.includes("json") || ct.includes("xml") || path.endsWith(".xml") || path.endsWith(".txt")
    ? await res.text()
    : "";
  return { url, status: res.status, location: res.headers.get("location"), text, headers: res.headers };
}

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

async function main() {
  const checks = [];

  // Host / HTTPS
  for (const u of ["http://sendfable.com/", "https://www.sendfable.com/", "https://sendfable.com/"]) {
    const r = await get(u);
    checks.push({
      name: `host ${u}`,
      status: r.status,
      location: r.location,
      ok: r.status === 200 || (r.status >= 300 && r.status < 400),
    });
  }

  const home = await get("/");
  checks.push({
    name: "homepage meta",
    status: home.status,
    title: pick(home.text, /<title>([^<]+)/i),
    canonical: pick(home.text, /rel="canonical" href="([^"]+)/i),
    ogImage: pick(home.text, /property="og:image" content="([^"]+)/i),
    heroNew: /without paying for CRM features/i.test(home.text),
    heroOld: /Create beautiful campaigns, reach the right people/i.test(home.text),
    earlyAccess: /join the waitlist|early access only/i.test(home.text),
  });

  const robots = await get("/robots.txt");
  checks.push({
    name: "robots",
    status: robots.status,
    hasSitemap: /sitemap\.xml/i.test(robots.text),
    disallowsAdmin: /Disallow:\s*\/(admin|api|dashboard|billing)/i.test(robots.text) || /Disallow:/i.test(robots.text),
    snippet: robots.text.slice(0, 400),
  });

  const sitemap = await get("/sitemap.xml");
  checks.push({
    name: "sitemap",
    status: sitemap.status,
    hasSolutions: /\/solutions</.test(sitemap.text) || /\/solutions"/.test(sitemap.text) || sitemap.text.includes("/solutions"),
    count: (sitemap.text.match(/<loc>/g) || []).length,
  });

  const og = await get("/brand/sendfable-social-card.jpg");
  checks.push({ name: "og image", status: og.status, ok: og.status === 200 });

  // SMS dark surfaces
  for (const p of ["/sms", "/sms/onboarding", "/billing/sms", "/sms/pricing-preview"]) {
    const r = await get(p);
    checks.push({
      name: `sms dark ${p}`,
      status: r.status,
      location: r.location,
      darkOk: r.status === 404 || r.status === 302 || r.status === 307 || r.status === 308,
    });
  }

  // Representative SEO pages
  for (const p of [
    "/solutions",
    "/solutions/restaurants",
    "/solutions/breweries",
    "/templates",
    "/pricing",
    "/compare/mailchimp",
    "/compare/mailerlite",
    "/email-marketing-guide",
    "/about",
    "/signup",
    "/login",
  ]) {
    const r = await get(p);
    checks.push({
      name: `seo ${p}`,
      status: r.status,
      title: pick(r.text, /<title>([^<]+)/i),
      canonical: pick(r.text, /rel="canonical" href="([^"]+)/i),
      h1: pick(r.text, /<h1[^>]*>([^<]+)/i),
    });
  }

  // Security headers on homepage
  const h = home.headers;
  checks.push({
    name: "security headers",
    hsts: h.get("strict-transport-security"),
    xfo: h.get("x-frame-options"),
    csp: Boolean(h.get("content-security-policy") || h.get("content-security-policy-report-only")),
    referrer: h.get("referrer-policy"),
  });

  console.log(JSON.stringify(checks, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
