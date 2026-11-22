#!/usr/bin/env node
/**
 * One-shot production SEO crawl: metadata + internal-link orphans from sitemap.
 * Usage: node scripts/seo-crawl-audit.mjs
 */
import fs from "node:fs";

const BASE = process.env.SEO_BASE || "https://sendfable.com";

function meta(html, name) {
  const re1 = new RegExp(
    `name=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const re2 = new RegExp(
    `content=["']([^"']*)["'][^>]*name=["']${name}["']`,
    "i"
  );
  return (html.match(re1) || html.match(re2) || [])[1] || "";
}

function titleOf(html) {
  return ((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "").trim();
}

function canonicalOf(html) {
  return (
    (
      html.match(/rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
      html.match(/href=["']([^"']*)["'][^>]*rel=["']canonical["']/i) ||
      []
    )[1] || ""
  );
}

function internalHrefs(html, pageUrl) {
  const out = new Set();
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const abs = new URL(href, pageUrl);
      if (abs.origin !== new URL(BASE).origin) continue;
      let path = abs.pathname;
      if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
      out.add(path);
    } catch {
      /* ignore */
    }
  }
  return out;
}

async function fetchText(url, opts = {}) {
  const r = await fetch(url, { redirect: opts.redirect || "follow", ...opts });
  const text = r.status === 200 || (r.status >= 200 && r.status < 400) ? await r.text().catch(() => "") : "";
  return { status: r.status, headers: r.headers, text, url: r.url };
}

async function main() {
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const hasLastmod = /lastmod/i.test(sm);
  const sitemapInfo = {
    phase: "sitemap",
    urls: locs.length,
    hasLastmod,
    refundBare: locs.some((u) => /\/refund$/.test(u)),
    refundPolicy: locs.some((u) => u.includes("refund-policy")),
  };

  const concurrency = 6;
  const queue = [...locs];
  const pages = [];
  const inbound = new Map(); // path -> Set<source path>
  for (const loc of locs) {
    let p = new URL(loc).pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    inbound.set(p, new Set());
  }

  async function work() {
    while (queue.length) {
      const loc = queue.shift();
      try {
        const head = await fetch(loc, { redirect: "manual" });
        let status = head.status;
        let redirect = head.headers.get("location") || "";
        let html = "";
        let finalUrl = loc;
        if (status >= 300 && status < 400 && redirect) {
          const abs = redirect.startsWith("http") ? redirect : new URL(redirect, BASE).href;
          const r2 = await fetch(abs, { redirect: "follow" });
          status = r2.status;
          html = status === 200 ? await r2.text() : "";
          finalUrl = r2.url;
        } else if (status === 200) {
          html = await head.text();
        }
        const path = new URL(loc).pathname.replace(/\/$/, "") || "/";
        const title = titleOf(html);
        const desc = meta(html, "description");
        const robots = meta(html, "robots");
        const canonical = canonicalOf(html);
        pages.push({
          url: loc,
          path,
          status: head.status,
          final: status,
          redirect,
          title,
          desc,
          robots,
          canonical,
          titleLen: title.length,
          descLen: desc.length,
        });
        if (html) {
          for (const target of internalHrefs(html, finalUrl)) {
            if (!inbound.has(target)) continue;
            if (target === path) continue;
            inbound.get(target).add(path);
          }
        }
      } catch (e) {
        pages.push({ url: loc, error: String(e) });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => work()));

  const ok = pages.filter((p) => !p.error && p.final === 200);
  const titles = new Map();
  const descs = new Map();
  for (const p of ok) {
    if (p.title) titles.set(p.title, (titles.get(p.title) || []).concat(p.url));
    if (p.desc) descs.set(p.desc, (descs.get(p.desc) || []).concat(p.url));
  }
  const dupT = [...titles.entries()].filter(([, u]) => u.length > 1);
  const dupD = [...descs.entries()].filter(([, u]) => u.length > 1);
  const longT = ok.filter((p) => p.titleLen > 60);
  const longD = ok.filter((p) => p.descLen > 160);
  const missT = ok.filter((p) => !p.title);
  const missD = ok.filter((p) => !p.desc);
  const noindex = ok.filter((p) => /noindex/i.test(p.robots || ""));
  const bad = pages.filter(
    (p) => p.error || (p.final && p.final >= 400) || (p.status >= 400 && !p.redirect)
  );

  const orphans = [];
  const oneLink = [];
  const twoPlus = [];
  for (const [path, sources] of inbound) {
    const n = sources.size;
    if (n === 0) orphans.push(path);
    else if (n === 1) oneLink.push({ path, from: [...sources][0] });
    else twoPlus.push(path);
  }

  // Extra probes
  const refund = await fetch(`${BASE}/refund`, { redirect: "manual" });
  const f404 = await fetch(`${BASE}/f/this-form-does-not-exist-xyz`, { redirect: "manual" });
  const f404html = f404.status === 404 ? await f404.text() : "";

  const summary = {
    phase: "summary",
    indexableOk: ok.length,
    badStatus: bad.slice(0, 25),
    titleOver60: longT.length,
    descOver160: longD.length,
    dupTitles: dupT.length,
    dupDescs: dupD.length,
    missingTitles: missT.length,
    missingDescs: missD.length,
    accidentalNoindex: noindex.map((p) => p.url),
    orphans: orphans.sort(),
    oneLinkCount: oneLink.length,
    twoPlusCount: twoPlus.length,
    oneLinkSample: oneLink.slice(0, 80),
    longTitles: longT
      .sort((a, b) => b.titleLen - a.titleLen)
      .slice(0, 50)
      .map((p) => ({ url: p.url, len: p.titleLen, title: p.title })),
    longDescs: longD
      .sort((a, b) => b.descLen - a.descLen)
      .slice(0, 50)
      .map((p) => ({ url: p.url, len: p.descLen, desc: p.desc })),
    dupTitleSamples: dupT.slice(0, 20).map(([t, u]) => ({ t, n: u.length, urls: u })),
    dupDescSamples: dupD.slice(0, 15).map(([d, u]) => ({
      d: d.slice(0, 120),
      n: u.length,
      urls: u,
    })),
    refund: { status: refund.status, location: refund.headers.get("location") },
    unknownForm: {
      status: f404.status,
      noindex: /noindex/i.test(meta(f404html, "robots") || f404html),
      title: titleOf(f404html),
    },
  };

  const outFile =
    process.env.SEO_OUT ||
    `${process.env.TEMP || "/tmp"}/sf-seo-summary.json`;
  const payload = { sitemap: sitemapInfo, summary };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`WROTE ${outFile}`);
  console.log(
    JSON.stringify({
      urls: sitemapInfo.urls,
      hasLastmod: sitemapInfo.hasLastmod,
      indexableOk: summary.indexableOk,
      titleOver60: summary.titleOver60,
      descOver160: summary.descOver160,
      dupTitles: summary.dupTitles,
      dupDescs: summary.dupDescs,
      orphans: summary.orphans.length,
      oneLinkCount: summary.oneLinkCount,
      twoPlusCount: summary.twoPlusCount,
      refund: summary.refund,
      unknownForm: summary.unknownForm,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
