/**
 * Production 72h growth verification — run inside worker container:
 *   npx tsx scripts/vps-72h-growth-verify-inner.ts
 */
import { prisma } from "../src/lib/prisma";
import { reportAcquisitionFlags, acquisitionFromAddress } from "../src/lib/acquisition/flags";
import { isPipelinePaused, ensurePipelineControl } from "../src/lib/acquisition/caps";
import { verifyAcquisitionSender } from "../src/lib/acquisition/sender";
import { testAcquisitionImapLogin } from "../src/lib/acquisition/reply-imap";
import { getInventoryHealth } from "../src/lib/acquisition/discovery/inventory";
import {
  isWithinSendWindow,
  defaultProspectTimeZone,
} from "../src/lib/acquisition/schedule";
import { getStageCaps } from "../src/lib/acquisition/ramp";
import { runQualityGate } from "../src/lib/acquisition/quality-gate";
import { isSuppressed, isExistingCustomerDomainOrEmail } from "../src/lib/acquisition/suppression";
import { emailMatchesWebsiteDomain } from "../src/lib/acquisition/quality-gate";

function chicagoLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function nextChicagoWindow(from: Date) {
  for (let i = 0; i < 24 * 10; i++) {
    const t = new Date(from.getTime() + i * 60_000);
    const r = isWithinSendWindow(t, "America/Chicago");
    if (r.ok) {
      return { nextIso: t.toISOString(), nextChicago: chicagoLabel(t), minutesAhead: i };
    }
  }
  return { nextIso: null, nextChicago: null, minutesAhead: null };
}

async function main() {
  const now = new Date();
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000);
  const sinceAcq = new Date("2026-08-25T00:00:00.000Z");
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const flags = reportAcquisitionFlags();
  const paused = await isPipelinePaused();
  const control = await ensurePipelineControl();
  const sender = await verifyAcquisitionSender();
  const imap = await testAcquisitionImapLogin();
  const inventory = await getInventoryHealth();
  const caps = await getStageCaps();

  const drafts = await prisma.acquisitionMessage.findMany({
    where: { dryRun: false, status: { in: ["DRAFT", "SCHEDULED"] } },
    include: { prospect: true },
    orderBy: { createdAt: "asc" },
  });

  const draftAudit = [];
  for (const m of drafts) {
    const p = m.prospect;
    const email = p.contactEmail || "";
    const tz = defaultProspectTimeZone(p.state);
    const win = isWithinSendWindow(now, tz);
    const gate = await runQualityGate(p, { requireFrom: true, autonomous: true });
    const supp = await isSuppressed(email, p.domain);
    const cust = await isExistingCustomerDomainOrEmail(email, p.domain);
    draftAudit.push({
      messageId: m.id,
      status: m.status,
      step: m.step,
      subject: m.subject.slice(0, 80),
      business: p.businessName,
      domain: p.domain,
      emailLocal: email.split("@")[0] || null,
      emailHost: email.split("@")[1] || null,
      emailMatchesDomain: emailMatchesWebsiteDomain(email, p.domain),
      claimOk: Boolean(p.personalizationClaim),
      evidenceOk: Boolean(p.personalizationEvidence),
      claimPreview: (p.personalizationClaim || "").slice(0, 100),
      hasUnsub: /unsubscribe/i.test(m.bodyText),
      hasCaseyLink: /utm_source=casey/i.test(m.bodyText),
      hasLanding: /email-marketing-for-small-business/i.test(m.bodyText),
      suppressed: supp.suppressed,
      existingCustomer: cust,
      qualityGateOk: gate.ok,
      qualityFailures: gate.failures,
      tz,
      windowNowOk: win.ok,
      windowReason: win.reason || null,
      wouldSendNow: win.ok && gate.ok && !supp.suppressed && !cust,
    });
  }

  const sentToday = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      sentAt: { gte: todayStart },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
  });
  const msgsByStatus = await prisma.acquisitionMessage.groupBy({
    by: ["status"],
    _count: true,
  });
  const sentSinceAcq = await prisma.acquisitionMessage.findMany({
    where: { dryRun: false, sentAt: { gte: sinceAcq } },
    select: {
      id: true,
      status: true,
      step: true,
      sentAt: true,
      deliveredAt: true,
      bounceAt: true,
      complaintAt: true,
      sesMessageId: true,
      error: true,
    },
    orderBy: { sentAt: "desc" },
  });

  // Funnel 30d
  const users30 = await prisma.user.findMany({
    where: { createdAt: { gte: since30 } },
    select: { id: true, emailVerified: true, plan: true, createdAt: true },
  });
  const verifiedSenders = await prisma.senderIdentity.count({
    where: { status: "VERIFIED", verifiedAt: { gte: since30 } },
  });
  const campaignsCreated = await prisma.campaign.count({
    where: { createdAt: { gte: since30 } },
  });
  const firstSends = await prisma.campaign.count({
    where: { status: "COMPLETED", updatedAt: { gte: since30 } },
  });
  // Second sends: workspaces with >=2 completed
  const completedByWs = await prisma.campaign.groupBy({
    by: ["workspaceId"],
    where: { status: "COMPLETED" },
    _count: true,
  });
  const secondSendWorkspaces = completedByWs.filter((r) => r._count >= 2).length;

  let analytics: Array<{ event: string; count: number }> = [];
  try {
    const rows = await prisma.productAnalyticsEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since30 } },
      _count: true,
    });
    analytics = rows
      .map((r) => ({ event: r.event, count: r._count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
  } catch (e) {
    analytics = [{ event: `error:${e instanceof Error ? e.message : e}`, count: 0 }];
  }

  const caseyVisits = await prisma.productAnalyticsEvent.count({
    where: { createdAt: { gte: sinceAcq }, utmSource: "casey" },
  }).catch(() => -1);

  const outreachSignups = await prisma.acquisitionEvent.count({
    where: { type: "signup_matched", createdAt: { gte: sinceAcq } },
  });
  const outreachPaid = await prisma.acquisitionProspect.count({
    where: { paidAt: { not: null } },
  });
  const replies = await prisma.acquisitionEvent.count({
    where: { type: "reply", createdAt: { gte: sinceAcq } },
  });

  const paidUsers = await prisma.user.count({ where: { plan: { not: "FREE" } } });
  const checkoutStarts = analytics.find((a) => a.event === "checkout_started")?.count ?? 0;

  console.log(
    JSON.stringify(
      {
        commitHint: "see host git",
        nowUtc: now.toISOString(),
        nowChicago: chicagoLabel(now),
        flags,
        fromConfigured: acquisitionFromAddress(),
        paused,
        control: {
          paused: control.paused,
          hardPause: control.hardPause,
          pauseReason: control.pauseReason,
          rampStage: control.rampStage,
          lastTickAt: control.lastTickAt,
        },
        sender,
        imap: { ok: imap.ok, detail: (imap as { detail?: string; reason?: string }).detail || (imap as { reason?: string }).reason || null },
        inventory,
        caps,
        windowNowChicago: isWithinSendWindow(now, "America/Chicago"),
        nextSendWindowChicago: nextChicagoWindow(now),
        sentToday,
        msgsByStatus,
        draftCount: drafts.length,
        draftAudit,
        wouldSendCount: draftAudit.filter((d) => d.wouldSendNow).length,
        sentSinceAcqSummary: {
          total: sentSinceAcq.length,
          withSesId: sentSinceAcq.filter((m) => m.sesMessageId).length,
          delivered: sentSinceAcq.filter((m) => m.deliveredAt || m.status === "DELIVERED").length,
          bounced: sentSinceAcq.filter((m) => m.bounceAt || m.status === "BOUNCED").length,
          complained: sentSinceAcq.filter((m) => m.complaintAt || m.status === "COMPLAINED").length,
          statuses: sentSinceAcq.reduce((acc: Record<string, number>, m) => {
            acc[m.status] = (acc[m.status] || 0) + 1;
            return acc;
          }, {}),
        },
        funnel30d: {
          analyticsTop: analytics,
          caseyAttributedVisits: caseyVisits,
          signups: users30.length,
          emailVerified: users30.filter((u) => u.emailVerified).length,
          senderVerified: verifiedSenders,
          campaignsCreated,
          completedCampaigns: firstSends,
          workspacesWith2PlusCompleted: secondSendWorkspaces,
          checkoutStarts,
          paidUsers,
          paidUsersTotal: paidUsers,
          outreachSignups,
          outreachPaid,
          replies,
        },
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
