#!/usr/bin/env bash
# Production root-cause audit for acquisition + funnel since 2026-08-25.
set -euo pipefail
cd /opt/sendfable

echo "===== GIT / COMMIT ====="
git rev-parse HEAD
git log -1 --oneline

echo ""
echo "===== ACQUISITION FLAGS ====="
for k in SENDFABLE_ACQUISITION_ENABLED SENDFABLE_ACQUISITION_DISCOVERY_ENABLED SENDFABLE_ACQUISITION_SENDING_ENABLED SENDFABLE_ACQUISITION_AUTO_APPROVE SENDFABLE_ACQUISITION_AUTO_RAMP SENDFABLE_ACQUISITION_MIN_SCORE SENDFABLE_ACQUISITION_RAMP_STAGE ANALYTICS_ENABLED; do
  v=$(grep -E "^${k}=" .env 2>/dev/null | head -1 | cut -d= -f2- || echo "(unset)")
  echo "$k=$v"
done

echo ""
echo "===== DOCKER ====="
docker compose ps
echo "--- worker logs last 200 ---"
docker compose logs --tail=200 worker 2>/dev/null | tail -120

echo ""
echo "===== WORKER CODE CHECK ====="
docker compose exec -T worker sh -c 'grep -n acquisition /app/dist/worker/index.js 2>/dev/null | head -20 || grep -rn "runAcquisitionTick\|acquisition" /app/src/worker 2>/dev/null | head -20 || ls /app | head'

echo ""
echo "===== DB AUDIT ====="
docker compose exec -T app node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const since = new Date("2026-08-25T00:00:00.000Z");
function dayKey(d) { return d.toISOString().slice(0, 10); }

(async () => {
  const out = {};
  out.prospectsTotal = await prisma.acquisitionProspect.count();
  out.prospectsByStatus = await prisma.acquisitionProspect.groupBy({ by: ["status"], _count: true });
  out.prospectsSourceKind = await prisma.acquisitionProspect.groupBy({ by: ["sourceKind"], _count: true });
  out.qualifiedUnsent = await prisma.acquisitionProspect.count({
    where: { status: "QUALIFIED", contactEmail: { not: null } },
  });
  out.approvedUnsent = await prisma.acquisitionProspect.count({
    where: { status: { in: ["READY", "QUEUED"] }, contactEmail: { not: null } },
  }).catch(() => null);

  const allTypes = await prisma.acquisitionEvent.groupBy({
    by: ["type"],
    where: { createdAt: { gte: since } },
    _count: true,
  });
  out.allEventTypesSince = allTypes;
  out.eventsTotalSince = await prisma.acquisitionEvent.count({ where: { createdAt: { gte: since } } });

  const events = await prisma.acquisitionEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, createdAt: true },
  });
  out.eventsDaily = {};
  for (const e of events) {
    const d = dayKey(e.createdAt);
    if (!out.eventsDaily[d]) out.eventsDaily[d] = {};
    out.eventsDaily[d][e.type] = (out.eventsDaily[d][e.type] || 0) + 1;
  }

  out.messagesByStatus = await prisma.acquisitionMessage.groupBy({ by: ["status"], _count: true });
  out.messagesSentSince = await prisma.acquisitionMessage.count({
    where: { dryRun: false, sentAt: { gte: since }, status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] } },
  });
  out.messagesSentTotal = await prisma.acquisitionMessage.count({
    where: { dryRun: false, sentAt: { not: null } },
  });
  out.recentMessages = await prisma.acquisitionMessage.findMany({
    where: { dryRun: false },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { status: true, step: true, sentAt: true, createdAt: true, sesMessageId: true, error: true, subject: true },
  });

  out.control = await prisma.acquisitionPipelineControl.findUnique({ where: { id: "default" } });

  out.usersTotal = await prisma.user.count();
  out.usersSince = await prisma.user.count({ where: { createdAt: { gte: since } } });
  out.usersVerifiedEmailSince = await prisma.user.count({
    where: { createdAt: { gte: since }, emailVerified: { not: null } },
  });
  out.usersByPlan = await prisma.user.groupBy({ by: ["plan"], _count: true });
  out.workspacesSince = await prisma.workspace.count({ where: { createdAt: { gte: since } } });
  out.contactsSince = await prisma.contact.count({ where: { createdAt: { gte: since } } });
  out.campaignsSince = await prisma.campaign.count({ where: { createdAt: { gte: since } } });
  out.campaignsCompletedSince = await prisma.campaign.count({
    where: { status: "COMPLETED", updatedAt: { gte: since } },
  });
  out.campaignsCompletedTotal = await prisma.campaign.count({ where: { status: "COMPLETED" } });
  out.verifiedSenders = await prisma.senderIdentity.count({ where: { status: "VERIFIED" } });

  try {
    out.analyticsEvents = (await prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: true,
    })).sort((a,b)=>b._count-a._count).slice(0,50);
    out.analyticsTotal = await prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } });
  } catch (e) { out.analyticsEvents = e.message; }

  // Daily users
  const users = await prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, emailVerified: true, plan: true } });
  out.usersDaily = {};
  for (const u of users) {
    const d = dayKey(u.createdAt);
    if (!out.usersDaily[d]) out.usersDaily[d] = { signups: 0, verified: 0, paid: 0 };
    out.usersDaily[d].signups++;
    if (u.emailVerified) out.usersDaily[d].verified++;
    if (u.plan && u.plan !== "FREE") out.usersDaily[d].paid++;
  }

  out.sampleDomains = await prisma.acquisitionProspect.findMany({
    select: { domain: true, status: true, sourceKind: true, city: true, state: true, score: true, contactEmail: true, discoveredAt: true },
    orderBy: { discoveredAt: "desc" },
    take: 50,
  });

  // Distinct cities
  out.cities = await prisma.acquisitionProspect.groupBy({ by: ["city"], _count: true });

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE

echo "===== DONE ====="
