import { prisma } from "@/lib/prisma";
import {
  analyticsRetentionDays,
  registerAnalyticsDeliver,
  type AnalyticsContext,
  type AnalyticsEvent,
} from "@/lib/analytics";

let registered = false;
const DEDUPE_WINDOW_MS = 45_000;

/** Idempotent: wire first-party event persistence when analytics is enabled. */
export function ensureAnalyticsPersistence() {
  if (registered) return;
  registered = true;
  registerAnalyticsDeliver(async (event, props, ctx) => {
    if (ctx.sessionId) {
      const recent = await prisma.productAnalyticsEvent.findFirst({
        where: {
          sessionId: ctx.sessionId.slice(0, 64),
          event,
          path: ctx.path?.slice(0, 500) || null,
          createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (recent) return;
    }

    await prisma.productAnalyticsEvent.create({
      data: {
        event,
        props,
        path: ctx.path?.slice(0, 500) || null,
        utmSource: ctx.utmSource?.slice(0, 120) || null,
        utmMedium: ctx.utmMedium?.slice(0, 120) || null,
        utmCampaign: ctx.utmCampaign?.slice(0, 120) || null,
        utmContent: ctx.utmContent?.slice(0, 120) || null,
        utmTerm: ctx.utmTerm?.slice(0, 120) || null,
        sessionId: ctx.sessionId?.slice(0, 64) || null,
        firstTouch: ctx.firstTouch?.slice(0, 200) || null,
        lastTouch: ctx.lastTouch?.slice(0, 200) || null,
      },
    });
  });
}

export async function funnelCounts(days = 30, opts?: { excludeQa?: boolean }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.productAnalyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { event: true, props: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const props = (row.props || {}) as Record<string, unknown>;
    if (opts?.excludeQa !== false && props.qa === true) continue;
    counts[row.event] = (counts[row.event] || 0) + 1;
  }
  return counts as Record<AnalyticsEvent | string, number>;
}

export async function pruneAnalyticsOlderThanRetention(): Promise<number> {
  const days = analyticsRetentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await prisma.productAnalyticsEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return res.count;
}
