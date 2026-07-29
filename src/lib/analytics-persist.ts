import { prisma } from "@/lib/prisma";
import {
  registerAnalyticsDeliver,
  type AnalyticsContext,
  type AnalyticsEvent,
} from "@/lib/analytics";

let registered = false;

/** Idempotent: wire first-party event persistence when analytics is enabled. */
export function ensureAnalyticsPersistence() {
  if (registered) return;
  registered = true;
  registerAnalyticsDeliver(async (event, props, ctx) => {
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

export async function funnelCounts(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.productAnalyticsEvent.groupBy({
    by: ["event"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.event, r._count._all])) as Record<
    AnalyticsEvent | string,
    number
  >;
}
