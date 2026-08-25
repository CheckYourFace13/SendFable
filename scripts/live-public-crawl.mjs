#!/usr/bin/env node
/**
 * Live public route crawl for launch certification.
 * Usage: node scripts/live-public-crawl.mjs
 */
const BASE = process.env.CRAWL_BASE || "https://sendfable.com";

async function fetchStatus(path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "SendFable-LaunchCert/1.0" },
    });
    const loc = res.headers.get("location");
    return { path, status: res.status, location: loc, ok: res.status >= 200 && res.status < 400 };
  } catch (e) {
    return { path, status: 0, error: e instanceof Error ? e.message : String(e), ok: false };
  }
}

async function getSitemapPaths() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try {
      return new URL(m[1]).pathname;
    } catch {
      return m[1];
    }
  });
  return urls;
}

const EXTRA = [
  "/robots.txt",
  "/sitemap.xml",
  "/brand/sendfable-social-card.jpg",
  "/favicon.ico",
  "/login",
  "/signup",
  "/email-marketing-for-restaurants",
  "/email-marketing-for-breweries",
  "/solutions",
];

async function main() {
  const sitemap = await getSitemapPaths();
  const paths = [...new Set([...sitemap, ...EXTRA])];
  const results = [];
  for (const p of paths) {
    results.push(await fetchStatus(p));
  }

  // Follow one hop on redirects for industry aliases
  const redirectFollow = [];
  for (const r of results.filter((x) => x.status >= 300 && x.status < 400 && x.location)) {
    const next = r.location.startsWith("http")
      ? new URL(r.location).pathname
      : r.location;
    redirectFollow.push({ from: r.path, ...(await fetchStatus(next)) });
  }

  const bad = results.filter((r) => !r.ok && !(r.status >= 300 && r.status < 400));
  const redirects = results.filter((r) => r.status >= 300 && r.status < 400);
  const ok = results.filter((r) => r.status === 200);

  console.log(`BASE ${BASE}`);
  console.log(`TOTAL ${results.length}`);
  console.log(`200 ${ok.length}`);
  console.log(`3xx ${redirects.length}`);
  console.log(`FAIL ${bad.length}`);
  if (redirects.length) {
    console.log("--- REDIRECTS ---");
    for (const r of redirects) console.log(`${r.status} ${r.path} -> ${r.location}`);
  }
  if (redirectFollow.length) {
    console.log("--- REDIRECT TARGETS ---");
    for (const r of redirectFollow) console.log(`${r.from} => ${r.status} ${r.path}`);
  }
  if (bad.length) {
    console.log("--- FAILURES ---");
    for (const r of bad) console.log(`${r.status} ${r.path} ${r.error || ""}`);
  }

  // Pricing / Free plan spot checks on homepage + pricing HTML
  for (const p of ["/", "/pricing", "/solutions"]) {
    const res = await fetch(`${BASE}${p}`);
    const html = await res.text();
    const has500 = /500\s*contacts/i.test(html);
    const has1000 = /1[,.]?000\s*emails/i.test(html) || /1,?000/.test(html);
    const has12 = /\$12/.test(html);
    const smsPublicClaim =
      /SMS (is|are) (now )?available|text messaging is live|buy SMS|SMS plans start/i.test(html) &&
      !/not (publicly )?available|not live|behind feature|SMS is not/i.test(html);
    console.log(
      `SPOT ${p} status=${res.status} free500=${has500} emails1k=${has1000} starter12=${has12} smsPublicClaim=${smsPublicClaim}`
    );
  }

  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
