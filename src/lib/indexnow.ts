/**
 * IndexNow helper — submit changed public URLs to Bing/Yandex after publish.
 * Disabled unless INDEXNOW_KEY is set. Rate-limited; never spam.
 */

import { appUrl } from "@/lib/utils";

const MIN_INTERVAL_MS = 60_000;
let lastSubmitAt = 0;

export function indexNowEnabled(): boolean {
  return Boolean(process.env.INDEXNOW_KEY?.trim());
}

export function indexNowKeyLocation(): string {
  if (!process.env.INDEXNOW_KEY?.trim()) return "";
  return appUrl("/indexnow/key.txt");
}

export async function submitIndexNow(urls: string[]): Promise<{
  ok: boolean;
  skipped?: string;
  status?: number;
  submitted: number;
}> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return { ok: false, skipped: "INDEXNOW_KEY unset", submitted: 0 };

  const now = Date.now();
  if (now - lastSubmitAt < MIN_INTERVAL_MS) {
    return { ok: false, skipped: "rate_limited", submitted: 0 };
  }

  const host = new URL(appUrl("/")).host;
  const clean = [...new Set(urls)]
    .map((u) => (u.startsWith("http") ? u : appUrl(u)))
    .filter((u) => {
      try {
        return new URL(u).host === host;
      } catch {
        return false;
      }
    })
    .slice(0, 100);

  if (!clean.length) return { ok: false, skipped: "no_urls", submitted: 0 };

  lastSubmitAt = now;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: indexNowKeyLocation(),
      urlList: clean,
    }),
  });

  return { ok: res.ok || res.status === 202, status: res.status, submitted: clean.length };
}
