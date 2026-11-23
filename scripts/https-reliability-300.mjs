#!/usr/bin/env node
/**
 * Sequential HTTPS reliability probe.
 * Usage: node scripts/https-reliability-300.mjs [base] [n]
 */
const BASE = process.argv[2] || "https://sendfable.com";
const N = Number(process.argv[3] || 300);
const PATHS = process.argv[4]
  ? process.argv[4].split(",")
  : ["/pricing"];

async function one(path) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "SendFableReliabilityProbe/1.0" },
    });
    const ms = Date.now() - started;
    return { ok: r.status === 200, status: r.status, ms, path, err: null };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      path,
      err: String(e?.message || e),
    };
  }
}

async function main() {
  let ok = 0;
  let fail = 0;
  const failures = [];
  const statuses = {};
  for (let i = 0; i < N; i++) {
    const path = PATHS[i % PATHS.length];
    const r = await one(path);
    statuses[r.status] = (statuses[r.status] || 0) + 1;
    if (r.ok) ok++;
    else {
      fail++;
      if (failures.length < 30) failures.push({ i: i + 1, ...r });
    }
    if ((i + 1) % 50 === 0) {
      console.error(`progress ${i + 1}/${N} ok=${ok} fail=${fail}`);
    }
  }
  console.log(
    JSON.stringify({ base: BASE, n: N, paths: PATHS, ok, fail, statuses, failures }, null, 2)
  );
  process.exit(fail ? 1 : 0);
}

main();
