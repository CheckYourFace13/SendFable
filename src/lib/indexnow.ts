/**
 * IndexNow helper — submit changed public URLs after publish.
 * Disabled unless INDEXNOW_KEY is set. Rate-limited, deduped, never spam.
 */

import { appUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const MIN_INTERVAL_MS = 60_000;
const DEDUPE_HOURS = 24;
let lastSubmitAt = 0;

/** Public marketing paths allowed for IndexNow (never admin/auth/billing/SMS). */
const BLOCKED_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/contacts",
  "/segments",
  "/tags",
  "/forms",
  "/billing",
  "/settings",
  "/onboarding",
  "/admin",
  "/inbox",
  "/library",
  "/api/",
  "/login",
  "/signup",
  "/unsubscribe",
  "/invite",
  "/early-access",
];

export function indexNowEnabled(): boolean {
  return Boolean(process.env.INDEXNOW_KEY?.trim());
}

export function indexNowKeyLocation(): string {
  if (!process.env.INDEXNOW_KEY?.trim()) return "";
  return appUrl("/indexnow/key.txt");
}

export function isPublicIndexableUrl(url: string): boolean {
  try {
    const host = new URL(appUrl("/")).host;
    const u = new URL(url.startsWith("http") ? url : appUrl(url));
    if (u.host !== host) return false;
    const path = u.pathname || "/";
    for (const p of BLOCKED_PREFIXES) {
      if (path === p || path.startsWith(`${p}/`)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function recentlySubmitted(url: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000);
  const hit = await prisma.indexNowSubmission.findFirst({
    where: { url, createdAt: { gte: since }, ok: true },
    select: { id: true },
  });
  return Boolean(hit);
}

async function postWithRetry(
  body: string,
  attempt = 1
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });
  if ((res.ok || res.status === 202) || attempt >= 3) {
    return { ok: res.ok || res.status === 202, status: res.status };
  }
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, attempt * 1500));
    return postWithRetry(body, attempt + 1);
  }
  return { ok: false, status: res.status };
}

export async function submitIndexNow(urls: string[]): Promise<{
  ok: boolean;
  skipped?: string;
  status?: number;
  submitted: number;
  urls: string[];
}> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return { ok: false, skipped: "INDEXNOW_KEY unset", submitted: 0, urls: [] };

  const now = Date.now();
  if (now - lastSubmitAt < MIN_INTERVAL_MS) {
    return { ok: false, skipped: "rate_limited", submitted: 0, urls: [] };
  }

  const host = new URL(appUrl("/")).host;
  const candidates = [...new Set(urls)]
    .map((u) => (u.startsWith("http") ? u : appUrl(u)))
    .filter(isPublicIndexableUrl)
    .slice(0, 100);

  const clean: string[] = [];
  for (const u of candidates) {
    if (!(await recentlySubmitted(u))) clean.push(u);
  }

  if (!clean.length) return { ok: false, skipped: "no_new_urls", submitted: 0, urls: [] };

  lastSubmitAt = now;
  const payload = JSON.stringify({
    host,
    key,
    keyLocation: indexNowKeyLocation(),
    urlList: clean,
  });

  const result = await postWithRetry(payload);

  await prisma.indexNowSubmission.createMany({
    data: clean.map((url) => ({
      url,
      ok: result.ok,
      status: result.status,
      batchSize: clean.length,
    })),
  });

  return { ok: result.ok, status: result.status, submitted: clean.length, urls: clean };
}
