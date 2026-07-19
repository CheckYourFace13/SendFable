import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getRedis } from "@/lib/redis";
import { getSesReadinessReport } from "@/lib/ses-readiness";
import { stripeBillingActive } from "@/lib/early-launch";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let redisOk = false;
  let queueDepth: number | null = null;
  try {
    const redis = getRedis();
    if (redis) {
      redisOk = (await redis.ping()) === "PONG";
      const depth = await redis.llen("bull:campaign-send:wait");
      queueDepth = typeof depth === "number" ? depth : null;
    }
  } catch {
    redisOk = false;
  }

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const [
    userCount,
    workspaceCount,
    contactCount,
    campaignCount,
    leadCount,
    heldUsers,
    suppressionCount,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.contact.count(),
    prisma.campaign.count(),
    prisma.earlyAccessLead.count(),
    prisma.user.count({ where: { sendingHeldAt: { not: null } } }),
    prisma.suppressionEntry.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        createdAt: true,
        userId: true,
        workspaceId: true,
        meta: true,
      },
    }),
  ]);

  const ses = await getSesReadinessReport();
  const stripeReady = stripeBillingActive();

  return NextResponse.json({
    system: {
      app: "ok",
      database: dbOk ? "ok" : "down",
      redis: redisOk ? "ok" : "down",
      queueDepth,
      version: process.env.GIT_COMMIT || process.env.npm_package_version || "unknown",
      earlyLaunch: process.env.EARLY_LAUNCH !== "false",
      sesReady: ses.awsCredentialsConfigured && !ses.devMailMode,
      stripeReady,
      lastBackupNote: "See /root/sendfable-backups on the VPS (ops script).",
    },
    counts: {
      users: userCount,
      workspaces: workspaceCount,
      contacts: contactCount,
      campaigns: campaignCount,
      earlyAccessLeads: leadCount,
      heldUsers,
      suppressions: suppressionCount,
    },
    ses,
    audit: recentAudit,
  });
}
