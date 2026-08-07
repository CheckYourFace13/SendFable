/**
 * Client analytics facade — first-party beacon + optional GA4.
 * Never sends PII (emails, phones, contact data) to GA4.
 * Free-text / feedback notes can be first-party only via `{ ga4: false }`.
 */

"use client";

import { trackClientEvent as trackFirstParty } from "@/components/marketing/marketing-analytics";

export type TrackProps = Record<string, string | number | boolean | undefined>;

const DEDUPE = new Map<string, number>();
const DEDUPE_MS = 2_000;

/** Events / prop keys that must never reach GA4. */
const GA4_BLOCKED_EVENTS = new Set(["feedback_note_text"]);
const GA4_BLOCKED_PROP =
  /email|phone|subject|body|address|token|secret|password|note|message|content|html|sms/i;

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const prev = DEDUPE.get(key) ?? 0;
  if (now - prev < DEDUPE_MS) return true;
  DEDUPE.set(key, now);
  return false;
}

function gaId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && /^G-[A-Z0-9]+$/i.test(id) ? id : undefined;
}

function trackGa4(event: string, props?: TrackProps) {
  if (typeof window === "undefined") return;
  if (!gaId()) return;
  if (GA4_BLOCKED_EVENTS.has(event)) return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined) continue;
    if (GA4_BLOCKED_PROP.test(k)) continue;
    if (typeof v === "string" && (v.includes("@") || v.length > 80)) continue;
    clean[k] = v;
  }
  try {
    gtag("event", event, clean);
  } catch {
    /* fail open */
  }
}

export function track(
  event: string,
  props?: TrackProps,
  opts?: { ga4?: boolean }
) {
  if (typeof window === "undefined") return;
  const key = `${event}:${JSON.stringify(props || {})}`;
  if (shouldDedupe(key)) return;
  trackFirstParty(event, props as Record<string, string | number | boolean> | undefined);
  if (opts?.ga4 === false) return;
  trackGa4(event, props);
}

export function isGaConfigured(): boolean {
  return Boolean(gaId());
}

export function getGaMeasurementId(): string | undefined {
  return gaId();
}
