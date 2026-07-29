import { NextResponse } from "next/server";
import { z } from "zod";
import {
  analyticsEnabled,
  deviceCategoryFromUa,
  isBotUserAgent,
  normalizeEventName,
  referrerDomainFrom,
  trackEvent,
} from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  event: z.string().min(1).max(80),
  props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  path: z.string().max(500).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  sessionId: z.string().max(64).optional(),
  firstTouch: z.string().max(200).optional(),
  lastTouch: z.string().max(200).optional(),
  qaTraffic: z.boolean().optional(),
  referrerDomain: z.string().max(120).optional(),
  deviceCategory: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
});

/** Public first-party beacon — no auth; rate-limited; no PII; fail open. */
export async function POST(req: Request) {
  try {
    if (!analyticsEnabled()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ua = req.headers.get("user-agent");
    if (isBotUserAgent(ua)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    // Rate-limit by coarse hash of IP — never persist the IP.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = await rateLimit("analytics", ip, 120, 60);
    if (!limited.ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const name = normalizeEventName(parsed.data.event);
    if (!name) {
      return NextResponse.json({ ok: true, skipped: "unknown_event" });
    }

    const qa =
      parsed.data.qaTraffic === true ||
      parsed.data.utmCampaign === "sf_qa" ||
      parsed.data.utmSource === "sf_qa";

    ensureAnalyticsPersistence();
    trackEvent(name, parsed.data.props, {
      path: parsed.data.path,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      utmContent: parsed.data.utmContent,
      utmTerm: parsed.data.utmTerm,
      sessionId: parsed.data.sessionId,
      firstTouch: parsed.data.firstTouch,
      lastTouch: parsed.data.lastTouch,
      referrerDomain:
        parsed.data.referrerDomain || referrerDomainFrom(req.headers.get("referer")),
      deviceCategory: parsed.data.deviceCategory || deviceCategoryFromUa(ua),
      qaTraffic: qa,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, skipped: "error" });
  }
}
