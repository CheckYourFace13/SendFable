import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { ensureAnalyticsPersistence, funnelCounts } from "@/lib/analytics-persist";
import { FUNNEL_STAGES, analyticsEnabled } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  ensureAnalyticsPersistence();
  const counts = analyticsEnabled() ? await funnelCounts(30) : {};
  const stages = FUNNEL_STAGES.map((s) => ({
    id: s.id,
    count: s.events.reduce((sum, e) => sum + (counts[e] || 0), 0),
    events: s.events.map((e) => ({ event: e, count: counts[e] || 0 })),
  }));

  const topPaths = analyticsEnabled()
    ? await prisma.productAnalyticsEvent.groupBy({
        by: ["path"],
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, path: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 20,
      })
    : [];

  const topCampaigns = analyticsEnabled()
    ? await prisma.productAnalyticsEvent.groupBy({
        by: ["utmCampaign"],
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          utmCampaign: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { utmCampaign: "desc" } },
        take: 20,
      })
    : [];

  return NextResponse.json({
    analyticsEnabled: analyticsEnabled(),
    days: 30,
    stages,
    topPaths: topPaths.map((r) => ({ path: r.path, count: r._count._all })),
    topCampaigns: topCampaigns.map((r) => ({ campaign: r.utmCampaign, count: r._count._all })),
  });
}
