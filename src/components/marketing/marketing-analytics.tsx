"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SESSION_KEY = "sf_aid";
const FIRST_TOUCH_KEY = "sf_ft";
const LAST_TOUCH_KEY = "sf_lt";

function readSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function captureUtm(search: URLSearchParams) {
  const source = search.get("utm_source") || undefined;
  const medium = search.get("utm_medium") || undefined;
  const campaign = search.get("utm_campaign") || undefined;
  const content = search.get("utm_content") || undefined;
  const term = search.get("utm_term") || undefined;
  if (!source && !medium && !campaign) return null;
  const touch = [source, medium, campaign].filter(Boolean).join("|");
  try {
    if (!localStorage.getItem(FIRST_TOUCH_KEY) && touch) {
      localStorage.setItem(FIRST_TOUCH_KEY, touch);
    }
    if (touch) localStorage.setItem(LAST_TOUCH_KEY, touch);
  } catch {
    /* ignore */
  }
  return { source, medium, campaign, content, term, touch };
}

export function trackClientEvent(
  event: string,
  props?: Record<string, number | boolean | string>
) {
  if (typeof window === "undefined") return;
  const search = new URLSearchParams(window.location.search);
  const utm = captureUtm(search);
  const body = {
    event,
    props: props ?? {},
    path: window.location.pathname,
    utmSource: utm?.source,
    utmMedium: utm?.medium,
    utmCampaign: utm?.campaign,
    utmContent: utm?.content,
    utmTerm: utm?.term,
    sessionId: readSessionId(),
    firstTouch: (() => {
      try {
        return localStorage.getItem(FIRST_TOUCH_KEY) || undefined;
      } catch {
        return undefined;
      }
    })(),
    lastTouch: (() => {
      try {
        return localStorage.getItem(LAST_TOUCH_KEY) || undefined;
      } catch {
        return undefined;
      }
    })(),
  };
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

/** Lightweight page-view instrumentation for marketing routes. */
export function MarketingAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureUtm(new URLSearchParams(searchParams?.toString() || ""));
    let event = "guide_view";
    if (pathname === "/") event = "homepage_view";
    else if (pathname === "/pricing") event = "pricing_view";
    else if (pathname.startsWith("/compare")) event = "comparison_view";
    else if (
      pathname.startsWith("/guides") ||
      pathname.startsWith("/mailchimp") ||
      pathname.startsWith("/best-") ||
      pathname.startsWith("/email-marketing") ||
      pathname === "/how-sendfable-works" ||
      pathname === "/about"
    ) {
      event = "guide_view";
    } else {
      return;
    }
    trackClientEvent(event);
  }, [pathname, searchParams]);

  return null;
}
