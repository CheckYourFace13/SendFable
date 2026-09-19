/**
 * Competitor pricing page monitor — fetch official pricing URLs, fingerprint content,
 * mark STALE when pages change meaningfully. Does NOT auto-overwrite public prices.
 *
 * Cron (weekly): npx tsx scripts/competitor-price-monitor.ts
 * Persist: data/competitor-price-monitor.json (gitignored optional) or stdout report.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { COMPETITOR_MATRIX, PRICING_MATRIX_VERIFIED } from "../src/data/competitors/pricing-matrix";
import { listPublicCompetitors } from "../src/data/competitors";

type MonitorEntry = {
  id: string;
  url: string;
  lastChecked: string | null;
  lastChanged: string | null;
  contentHash: string | null;
  status: "ok" | "changed" | "failed" | "stale";
  failStreak: number;
  httpStatus?: number;
  note?: string;
};

type MonitorState = {
  updatedAt: string;
  matrixVerified: string;
  entries: Record<string, MonitorEntry>;
};

const STATE_PATH = resolve(process.cwd(), "data/competitor-price-monitor.json");
const FAIL_ALERT_STREAK = 3;

function hashBody(text: string): string {
  // Normalize whitespace; drop volatile tokens loosely
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}/g, "DATE")
    .slice(0, 500_000);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function loadState(): MonitorState {
  if (!existsSync(STATE_PATH)) {
    return {
      updatedAt: new Date().toISOString(),
      matrixVerified: PRICING_MATRIX_VERIFIED,
      entries: {},
    };
  }
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as MonitorState;
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      matrixVerified: PRICING_MATRIX_VERIFIED,
      entries: {},
    };
  }
}

function saveState(state: MonitorState) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "SendFablePriceMonitor/1.0 (+https://sendfable.com; pricing freshness)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: e instanceof Error ? e.message : "fetch_failed" };
  }
}

async function main() {
  const state = loadState();
  const alerts: string[] = [];
  const now = new Date().toISOString();

  const targets = [
    ...COMPETITOR_MATRIX.map((r) => ({ id: r.id, url: r.pricingUrl })),
    ...listPublicCompetitors()
      .filter((c) => !COMPETITOR_MATRIX.some((m) => m.id === c.slug))
      .map((c) => ({ id: c.slug, url: c.pricingUrl })),
  ];

  for (const t of targets) {
    const prev = state.entries[t.id];
    const fetched = await fetchText(t.url);
    const entry: MonitorEntry = {
      id: t.id,
      url: t.url,
      lastChecked: now,
      lastChanged: prev?.lastChanged ?? null,
      contentHash: prev?.contentHash ?? null,
      status: "ok",
      failStreak: prev?.failStreak ?? 0,
    };

    if (!fetched.ok) {
      entry.status = "failed";
      entry.failStreak = (prev?.failStreak ?? 0) + 1;
      entry.httpStatus = fetched.status;
      entry.note = fetched.text.slice(0, 120);
      if (entry.failStreak >= FAIL_ALERT_STREAK) {
        alerts.push(
          `FAILED ${t.id} (${entry.failStreak} runs): HTTP ${fetched.status} ${t.url}`
        );
      }
      state.entries[t.id] = entry;
      continue;
    }

    const h = hashBody(fetched.text);
    entry.failStreak = 0;
    entry.httpStatus = fetched.status;
    entry.contentHash = h;
    if (prev?.contentHash && prev.contentHash !== h) {
      entry.status = "changed";
      entry.lastChanged = now;
      alerts.push(
        `CHANGED ${t.id}: pricing page fingerprint changed — review manually before updating catalog (${t.url})`
      );
    } else if (!prev?.contentHash) {
      entry.status = "ok";
      entry.note = "baseline";
    } else {
      entry.status = "ok";
    }

    // Mark stale if matrix verification older than 30 days vs last successful check concept
    const matrixAgeDays =
      (Date.now() - Date.parse(PRICING_MATRIX_VERIFIED + "T00:00:00Z")) / 86_400_000;
    if (matrixAgeDays > 30 && entry.status === "ok") {
      entry.status = "stale";
      entry.note = "matrix snapshot >30d — public pages should say verify current price";
    }

    state.entries[t.id] = entry;
  }

  state.updatedAt = now;
  state.matrixVerified = PRICING_MATRIX_VERIFIED;
  saveState(state);

  const report = {
    at: now,
    alertCount: alerts.length,
    alerts,
    summary: Object.values(state.entries).reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    note: "No automatic price overwrite. Owner alert only for meaningful changes or repeated failures.",
  };

  console.log(JSON.stringify(report, null, 2));
  // Exit 0 even with alerts — cron should email/stdout, not fail the box
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
