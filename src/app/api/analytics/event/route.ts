import { NextResponse } from "next/server";
import { z } from "zod";
import { analyticsEnabled, normalizeEventName, trackEvent } from "@/lib/analytics";
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
});

/** Public first-party beacon — no auth; rate-limited; no PII persistence. */
export async function POST(req: Request) {
  if (!analyticsEnabled()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

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
  });

  return NextResponse.json({ ok: true });
}
