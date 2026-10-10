import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerAdminUser } from "@/lib/platform-admin";
import { PLANS } from "@/lib/plans";

/** All workspaces (search/filter) for OWNER_ADMIN console. */
export async function GET(req: Request) {
  const admin = await requireOwnerAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const internalOnly = url.searchParams.get("internal") === "1";

  const workspaces = await prisma.workspace.findMany({
    where: {
      ...(internalOnly ? { isInternal: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { websiteUrl: { contains: q, mode: "insensitive" } },
              { internalLabel: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isInternal: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { user: { select: { id: true, email: true, plan: true } } },
        take: 1,
      },
      _count: { select: { contacts: true, campaigns: true } },
      marketingAutopilotConfig: { select: { enabled: true } },
    },
  });

  return NextResponse.json({
    workspaces: workspaces.map((ws) => {
      const owner = ws.memberships[0]?.user;
      const plan = (ws.isInternal && ws.internalPlanOverride) || owner?.plan || "FREE";
      return {
        id: ws.id,
        name: ws.name,
        websiteUrl: ws.websiteUrl,
        isInternal: ws.isInternal,
        internalLabel: ws.internalLabel,
        disabledAt: ws.disabledAt,
        plan,
        planSource:
          ws.isInternal && ws.internalPlanOverride
            ? "INTERNAL_PLAN_OVERRIDE"
            : "OWNER_PLAN",
        planLimits: PLANS[plan],
        contacts: ws._count.contacts,
        campaigns: ws._count.campaigns,
        autopilotEnabled: ws.marketingAutopilotConfig?.enabled ?? false,
        ownerEmail: owner?.email ?? null,
      };
    }),
  });
}
