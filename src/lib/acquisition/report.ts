import { ensurePipelineControl, isPipelinePaused } from "@/lib/acquisition/caps";
import {
  acquisitionAutoApprove,
  acquisitionAutoRamp,
  acquisitionFromAddress,
  acquisitionImapConfigured,
  acquisitionOwnerAlertEmail,
  reportAcquisitionFlags,
} from "@/lib/acquisition/flags";
import { sendEmail, platformFrom } from "@/lib/mailer";
import { buildWeeklyOptimization } from "@/lib/acquisition/weekly";
import {
  canRampGiven,
  getStageCaps,
  ratesOverDays,
} from "@/lib/acquisition/ramp";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import { prisma } from "@/lib/prisma";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function buildDailyAcquisitionReport(now = new Date()): Promise<string> {
  const since = startOfUtcDay(now);

  const discovered = await prisma.acquisitionEvent.count({
    where: { type: "discovered", createdAt: { gte: since } },
  });
  const qualified = await prisma.acquisitionProspect.count({
    where: { status: "QUALIFIED", updatedAt: { gte: since } },
  });
  const sentNew = await prisma.acquisitionMessage.count({
    where: {
      step: "INITIAL",
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
  });
  const followUps = await prisma.acquisitionMessage.count({
    where: {
      step: { in: ["FOLLOW_UP_1", "FOLLOW_UP_2"] },
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
  });
  const delivered = await prisma.acquisitionMessage.count({
    where: { dryRun: false, deliveredAt: { gte: since } },
  });
  const replies = await prisma.acquisitionEvent.count({
    where: { type: "reply", createdAt: { gte: since } },
  });
  const replyRows = await prisma.acquisitionEvent.findMany({
    where: { type: "reply", createdAt: { gte: since } },
    select: { meta: true },
  });
  const positive = replyRows.filter(
    (e) => (e.meta as { replyClass?: string })?.replyClass === "POSITIVE"
  ).length;
  const unsubs = await prisma.acquisitionProspect.count({
    where: { status: "UNSUBSCRIBED", updatedAt: { gte: since } },
  });
  const bounced = await prisma.acquisitionMessage.count({
    where: { dryRun: false, bounceAt: { gte: since } },
  });
  const signups = await prisma.acquisitionEvent.count({
    where: { type: "signup_matched", createdAt: { gte: since } },
  });
  const firstSends = await prisma.acquisitionProspect.count({
    where: { firstSendAt: { gte: since } },
  });
  const paid = await prisma.acquisitionProspect.count({
    where: { paidAt: { gte: since } },
  });

  const paused = await isPipelinePaused();
  const top = await prisma.acquisitionProspect.findFirst({
    where: { status: "QUALIFIED" },
    orderBy: { score: "desc" },
    select: { businessName: true, city: true, score: true },
  });

  const dateLabel = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return [
    `SendFable Acquisition — ${dateLabel}`,
    "",
    `Discovered: ${discovered}`,
    `Qualified: ${qualified}`,
    `New outreach: ${sentNew}`,
    `Follow-ups: ${followUps}`,
    `Delivered: ${delivered}`,
    `Replies: ${replies}`,
    `Positive: ${positive}`,
    `Unsubscribed: ${unsubs}`,
    `Bounced: ${bounced}`,
    `Signups: ${signups}`,
    `First sends: ${firstSends}`,
    `Paid: ${paid}`,
    "",
    `Pipeline paused: ${paused.paused ? `YES (${paused.reason || "—"})` : "NO"}`,
    top
      ? `Top prospect: ${top.businessName}${top.city ? ` (${top.city})` : ""} · score ${top.score}`
      : "Top prospect: —",
  ].join("\n");
}

export async function sendDailyAcquisitionReportIfDue(): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const control = await ensurePipelineControl();
  const now = new Date();
  if (control.lastDailyReportAt) {
    const last = control.lastDailyReportAt;
    if (
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate()
    ) {
      return { sent: false, reason: "already_sent_today" };
    }
  }

  const to = acquisitionOwnerAlertEmail();
  if (!to) return { sent: false, reason: "no_alert_email" };

  const body = await buildDailyAcquisitionReport(now);
  await sendEmail({
    from: platformFrom("SendFable Acquisition"),
    to,
    subject: `SendFable Acquisition — ${now.toISOString().slice(0, 10)}`,
    text: body,
    html: `<pre style="font-family:monospace;font-size:13px;">${body.replace(/</g, "&lt;")}</pre>`,
    tags: { kind: "acquisition_report" },
  });

  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { lastDailyReportAt: now },
  });

  return { sent: true };
}

export async function getAcquisitionDashboard() {
  const since = startOfUtcDay();
  const flags = reportAcquisitionFlags();
  const paused = await isPipelinePaused();

  const replyToday = await prisma.acquisitionEvent.findMany({
    where: { type: "reply", createdAt: { gte: since } },
    select: { meta: true },
  });

  const today = {
    discovered: await prisma.acquisitionEvent.count({
      where: { type: "discovered", createdAt: { gte: since } },
    }),
    qualified: await prisma.acquisitionProspect.count({
      where: { status: "QUALIFIED" },
    }),
    queued: await prisma.acquisitionProspect.count({ where: { status: "QUEUED" } }),
    sent: await prisma.acquisitionMessage.count({
      where: {
        dryRun: false,
        sentAt: { gte: since },
        status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      },
    }),
    delivered: await prisma.acquisitionMessage.count({
      where: { dryRun: false, deliveredAt: { gte: since } },
    }),
    bounced: await prisma.acquisitionMessage.count({
      where: { dryRun: false, bounceAt: { gte: since } },
    }),
    replies: replyToday.length,
    positiveReplies: replyToday.filter(
      (e) => (e.meta as { replyClass?: string })?.replyClass === "POSITIVE"
    ).length,
    unsubscribes: await prisma.acquisitionProspect.count({
      where: { status: "UNSUBSCRIBED", updatedAt: { gte: since } },
    }),
    signups: await prisma.acquisitionEvent.count({
      where: { type: "signup_matched", createdAt: { gte: since } },
    }),
    firstSends: await prisma.acquisitionProspect.count({
      where: { firstSendAt: { gte: since } },
    }),
    paid: await prisma.acquisitionProspect.count({
      where: { paidAt: { gte: since } },
    }),
  };

  const overall = {
    totalProspects: await prisma.acquisitionProspect.count(),
    contacted: await prisma.acquisitionProspect.count({
      where: {
        status: {
          in: [
            "CONTACTED",
            "FOLLOW_UP_1",
            "FOLLOW_UP_2",
            "OUTREACH_COMPLETE",
            "REPLIED",
            "INTERESTED",
            "SIGNED_UP",
            "PAID",
          ],
        },
      },
    }),
    replies: await prisma.acquisitionEvent.count({ where: { type: "reply" } }),
    signups: await prisma.acquisitionEvent.count({ where: { type: "signup_matched" } }),
    firstSends: await prisma.acquisitionProspect.count({
      where: { firstSendAt: { not: null } },
    }),
    paid: await prisma.acquisitionProspect.count({ where: { paidAt: { not: null } } }),
  };

  const pipeline = {
    pendingDiscovery: await prisma.acquisitionProspect.count({
      where: { status: "DISCOVERED" },
    }),
    needsEmail: await prisma.acquisitionProspect.count({
      where: { status: "NEEDS_EMAIL" },
    }),
    pendingPersonalization: await prisma.acquisitionProspect.count({
      where: {
        status: { in: ["DISCOVERED", "NEEDS_EMAIL"] },
        personalizationClaim: null,
      },
    }),
    scheduled: await prisma.acquisitionMessage.count({
      where: { status: "SCHEDULED", dryRun: false },
    }),
    followUpDue: await prisma.acquisitionProspect.count({
      where: {
        nextFollowUpAt: { lte: new Date() },
        status: { in: ["CONTACTED", "FOLLOW_UP_1"] },
      },
    }),
    stopped: await prisma.acquisitionProspect.count({
      where: {
        status: {
          in: [
            "OUTREACH_COMPLETE",
            "UNSUBSCRIBED",
            "BOUNCED",
            "COMPLAINT",
            "SUPPRESSED",
            "NOT_INTERESTED",
            "SIGNED_UP",
            "PAID",
          ],
        },
      },
    }),
  };

  const byCategory = await prisma.acquisitionProspect.groupBy({
    by: ["category"],
    _count: true,
    orderBy: { _count: { category: "desc" } },
    take: 10,
  });
  const byCity = await prisma.acquisitionProspect.groupBy({
    by: ["city"],
    _count: true,
    orderBy: { _count: { city: "desc" } },
    take: 10,
  });

  const recent = await prisma.acquisitionProspect.findMany({
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      businessName: true,
      domain: true,
      city: true,
      category: true,
      score: true,
      status: true,
      contactEmail: true,
      personalizationClaim: true,
    },
  });

  const weekly = await buildWeeklyOptimization(7);
  const stageCaps = await getStageCaps();
  const rates7 = await ratesOverDays(7);
  const control = await ensurePipelineControl();
  const entered = control.stageEnteredAt || control.updatedAt;
  const bizDays = Math.max(
    0,
    Math.floor((Date.now() - entered.getTime()) / (24 * 60 * 60 * 1000))
  );
  const rampCheck = canRampGiven({
    autoRamp: acquisitionAutoRamp(),
    stage: stageCaps.stage,
    businessDaysInStage: bizDays,
    sent: rates7.sent,
    bounceRate: rates7.bounceRate,
    complaintRate: rates7.complaintRate,
    unsubRate: rates7.unsubRate,
  });
  const sender = await verifyAcquisitionSender();
  const allReplies = await prisma.acquisitionEvent.findMany({
    where: { type: "reply" },
    select: { meta: true },
    take: 1000,
  });
  const positiveAll = allReplies.filter(
    (e) => (e.meta as { replyClass?: string })?.replyClass === "POSITIVE"
  ).length;

  let autonomyStatus = "DISABLED";
  if (paused.paused) autonomyStatus = control.hardPause ? "HARD_PAUSED" : "PAUSED";
  else if (flags.SENDFABLE_ACQUISITION_ENABLED) {
    if (!flags.SENDFABLE_ACQUISITION_SENDING_ENABLED) autonomyStatus = "DISCOVERY_ONLY";
    else if (!sender.ok) autonomyStatus = "SENDER_BLOCKED";
    else autonomyStatus = "AUTONOMOUS";
  }

  const autonomy = {
    status: autonomyStatus,
    stage: stageCaps.stage,
    newPerDay: stageCaps.newPerDay,
    totalPerDay: stageCaps.totalPerDay,
    todaySent: today.sent,
    rates7d: {
      bouncePct: Math.round(rates7.bounceRate * 10000) / 100,
      complaintPct: Math.round(rates7.complaintRate * 10000) / 100,
      unsubPct: Math.round(rates7.unsubRate * 10000) / 100,
      sent: rates7.sent,
    },
    replies: overall.replies,
    positiveReplies: positiveAll,
    signups: overall.signups,
    firstSends: overall.firstSends,
    paid: overall.paid,
    nextRamp: rampCheck.eligible
      ? `eligible → stage ${Math.min(4, stageCaps.stage + 1)}`
      : rampCheck.reason,
    pauseReason: paused.reason,
    hardPause: control.hardPause,
    senderOk: sender.ok,
    senderDetail: sender.detail,
    imapConfigured: acquisitionImapConfigured(),
    autoApprove: acquisitionAutoApprove(),
    autoRamp: acquisitionAutoRamp(),
  };

  return {
    flags,
    fromConfigured: Boolean(acquisitionFromAddress()),
    paused: paused.paused,
    pauseReason: paused.reason,
    hardPause: control.hardPause,
    today,
    overall,
    pipeline,
    autonomy,
    topIndustries: byCategory.map((r) => ({
      category: r.category,
      count: r._count,
    })),
    topCities: byCity.filter((r) => r.city).map((r) => ({ city: r.city, count: r._count })),
    recent,
    weekly,
  };
}
