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
  formatUnsubSafetyExplanation,
  getStageCaps,
  ratesOverDays,
  UNSUB_SAFETY_THRESHOLDS,
} from "@/lib/acquisition/ramp";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import { prisma } from "@/lib/prisma";
import { trackComparisonLines } from "@/lib/acquisition/website-demo/metrics";
import {
  WEBSITE_DEMO_COPY_VERSION,
  WEBSITE_DEMO_DAILY_NEW_LIMIT,
} from "@/lib/acquisition/queue-policy";

const REPORT_TZ = "America/Chicago";
/** Send the daily report after the Chicago send window has had time to run. */
const REPORT_AFTER_HOUR_CHICAGO = 16;

function chicagoParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateKey: string;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  ) as Record<string, string>;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const minute = Number(parts.minute);
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** Start of the America/Chicago calendar day containing `d`, as a UTC Date. */
export function startOfChicagoDay(d = new Date()): Date {
  const target = chicagoParts(d).dateKey;
  // Chicago is UTC−5/−6 — search a 36h window around the nominal UTC date.
  const [y, m, day] = target.split("-").map(Number) as [number, number, number];
  let lo = Date.UTC(y, m - 1, day) - 18 * 3600_000;
  let hi = Date.UTC(y, m - 1, day) + 18 * 3600_000;
  while (hi - lo > 30_000) {
    const mid = Math.floor((lo + hi) / 2);
    const p = chicagoParts(new Date(mid));
    if (p.dateKey < target || (p.dateKey === target && (p.hour > 0 || p.minute > 0))) {
      // mid is still on/after the target day's first minute — go earlier if past midnight
      if (p.dateKey > target) hi = mid;
      else if (p.dateKey < target) lo = mid;
      else hi = mid; // same day but past 00:00
    } else if (p.dateKey === target && p.hour === 0 && p.minute === 0) {
      // Found midnight region — tighten to earliest
      hi = mid;
    } else {
      lo = mid;
    }
  }
  // Advance to first instant of the Chicago day
  let t = lo;
  while (chicagoParts(new Date(t)).dateKey < target) t += 30_000;
  // Snap back to exact :00 if we overshot into minutes
  while (
    chicagoParts(new Date(t)).dateKey === target &&
    (chicagoParts(new Date(t)).hour > 0 || chicagoParts(new Date(t)).minute > 0)
  ) {
    t -= 30_000;
  }
  while (chicagoParts(new Date(t)).dateKey < target) t += 1000;
  const out = new Date(t);
  out.setUTCMilliseconds(0);
  return out;
}

function chicagoDateKey(d: Date): string {
  return chicagoParts(d).dateKey;
}

export function isPastChicagoReportHour(now = new Date()): boolean {
  return chicagoParts(now).hour >= REPORT_AFTER_HOUR_CHICAGO;
}

export async function buildDailyAcquisitionReport(now = new Date()): Promise<string> {
  const since = startOfChicagoDay(now);
  const dayKey = chicagoDateKey(now);

  const discovered = await prisma.acquisitionEvent.count({
    where: { type: "discovered", createdAt: { gte: since } },
  });
  const qualified = await prisma.acquisitionProspect.count({
    where: { status: "QUALIFIED", updatedAt: { gte: since } },
  });
  const caseyNew = await prisma.acquisitionMessage.count({
    where: {
      step: "INITIAL",
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      OR: [{ copyVersion: null }, { copyVersion: { not: WEBSITE_DEMO_COPY_VERSION } }],
    },
  });
  const demoNew = await prisma.acquisitionMessage.count({
    where: {
      step: "INITIAL",
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      copyVersion: WEBSITE_DEMO_COPY_VERSION,
    },
  });
  const sentNew = caseyNew + demoNew;
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
  const clicks = await prisma.acquisitionMessage.count({
    where: { dryRun: false, clickedAt: { gte: since } },
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
  const autopilotEventRows = await prisma.acquisitionEvent.findMany({
    where: {
      type: { in: ["clicked", "site_visit"] },
      createdAt: { gte: since },
    },
    select: { meta: true },
    take: 500,
  });
  const autopilotClicks = autopilotEventRows.filter((e) => {
    const m = e.meta as { path?: string; ctaPath?: string } | null;
    return (
      m?.path === "/automated-email-marketing" ||
      m?.ctaPath === "/automated-email-marketing"
    );
  }).length;

  const paused = await isPipelinePaused();
  const top = await prisma.acquisitionProspect.findFirst({
    where: { status: "QUALIFIED" },
    orderBy: { score: "desc" },
    select: { businessName: true, city: true, score: true },
  });

  const stageCaps = await getStageCaps();
  const { getInventoryHealth } = await import("@/lib/acquisition/discovery/inventory");
  const inventory = await getInventoryHealth();
  const { getConversionOptimizationSnapshot } = await import(
    "@/lib/acquisition/conversion-optimize"
  );
  const conversion = await getConversionOptimizationSnapshot().catch(() => null);
  const abWinner =
    (conversion as { activeCopyVersion?: string; abTest?: { enabled?: boolean } } | null)
      ?.activeCopyVersion || "v1a/v1b Autopilot A/B";
  const rates7 = await ratesOverDays(7);
  const unsubSafetyLine = formatUnsubSafetyExplanation({
    sent: rates7.sent,
    unsubscribed: rates7.unsubscribed,
    unsubRate: rates7.unsubRate,
  });

  const dateLabel = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: REPORT_TZ,
  });

  return [
    `SendFable Acquisition — ${dateLabel} (America/Chicago day)`,
    `Reporting period: ${dayKey} 00:00 → report time, America/Chicago`,
    "",
    `Discovered: ${discovered}`,
    `Qualified: ${qualified}`,
    `Normal Casey new: ${caseyNew}`,
    `Personalized demo new: ${demoNew}`,
    `Total new outreach: ${sentNew}`,
    `Follow-ups: ${followUps}`,
    `Sent (new+fu): ${sentNew + followUps}`,
    `Delivered (all tracks): ${delivered}`,
    `Clicks (all tracks): ${clicks}`,
    `Replies: ${replies}`,
    `Positive: ${positive}`,
    `Unsubscribed: ${unsubs}`,
    `Bounced: ${bounced}`,
    `Signups: ${signups}`,
    `First sends: ${firstSends}`,
    `Paid: ${paid}`,
    `Autopilot CTA results (clicks/visits): ${autopilotClicks}`,
    ...(await trackComparisonLines(since)),
    "",
    `Current A/B: ${abWinner}`,
    `Current stage: ${stageCaps.stage}`,
    `Daily Casey new cap: ${stageCaps.newPerDay}`,
    `Personalized demo cap: ${WEBSITE_DEMO_DAILY_NEW_LIMIT}/day (separate; does not consume Casey cap)`,
    `Combined new capacity: ${stageCaps.newPerDay + WEBSITE_DEMO_DAILY_NEW_LIMIT}/day`,
    `Daily Casey total cap: ${stageCaps.totalPerDay}`,
    `Inventory (sendable): ${inventory.sendableInventory}`,
    `Pipeline paused: ${paused.paused ? `YES (${paused.reason || "—"})` : "NO"}`,
    `7D safety sends: ${rates7.sent}`,
    `7D safety unsubs: ${rates7.unsubscribed}`,
    `7D unsub rate: ${(rates7.unsubRate * 100).toFixed(2)}%`,
    `Unsub soft threshold: >${UNSUB_SAFETY_THRESHOLDS.softRate * 100}%`,
    `Unsub hard threshold: ≥${UNSUB_SAFETY_THRESHOLDS.hardRate * 100}% (below ${UNSUB_SAFETY_THRESHOLDS.rateOnlyMinSent} sends also needs ≥${UNSUB_SAFETY_THRESHOLDS.smallSampleAbsFloor} unsubs)`,
    `Unsub safety: ${unsubSafetyLine}`,
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

  if (!isPastChicagoReportHour(now)) {
    return { sent: false, reason: "before_chicago_16h" };
  }

  const todayKey = chicagoDateKey(now);
  if (control.lastDailyReportAt) {
    const lastKey = chicagoDateKey(control.lastDailyReportAt);
    if (lastKey === todayKey) {
      return { sent: false, reason: "already_sent_today" };
    }
  }

  const to = acquisitionOwnerAlertEmail();
  if (!to) return { sent: false, reason: "no_alert_email" };

  const body = await buildDailyAcquisitionReport(now);
  await sendEmail({
    from: platformFrom("SendFable Acquisition"),
    to,
    subject: `SendFable Acquisition — ${todayKey} (Chicago day)`,
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
  const since = startOfChicagoDay();
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
  const { getConversionOptimizationSnapshot } = await import(
    "@/lib/acquisition/conversion-optimize"
  );
  const conversionOptimization = await getConversionOptimizationSnapshot();
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

  const { getInventoryHealth } = await import("@/lib/acquisition/discovery/inventory");
  const inventory = await getInventoryHealth();

  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const growthHealth = {
    discovery: inventory.status,
    inventoryStatus: inventory.status,
    qualifiedInventory: inventory.sendableInventory,
    qualifiedUnsent: inventory.qualifiedUnsent,
    queuedUnsent: inventory.queuedUnsent,
    daysOfInventory: inventory.daysOfInventory,
    targetMin: inventory.targetMin,
    preferredTarget: inventory.preferredTarget,
    lastDiscoveryAt: inventory.lastDiscoveryAt?.toISOString() ?? null,
    lastEmailSentAt: inventory.lastEmailSentAt?.toISOString() ?? null,
    attemptsToday: inventory.attemptsToday,
    dailyCeiling: inventory.dailyCeiling,
    sentToday: today.sent,
    sent7d: rates7.sent,
    delivered7d: await prisma.acquisitionMessage.count({
      where: { dryRun: false, deliveredAt: { gte: since7 } },
    }),
    replies7d: await prisma.acquisitionEvent.count({
      where: { type: "reply", createdAt: { gte: since7 } },
    }),
    signups7d: await prisma.acquisitionEvent.count({
      where: { type: "signup_matched", createdAt: { gte: since7 } },
    }),
    paid7d: await prisma.acquisitionProspect.count({
      where: { paidAt: { gte: since7 } },
    }),
    rampStage: stageCaps.stage,
    nextRamp: rampCheck.eligible
      ? `eligible → stage ${Math.min(4, stageCaps.stage + 1)}`
      : rampCheck.reason,
    sourceKinds: await prisma.acquisitionProspect.groupBy({
      by: ["sourceKind"],
      _count: true,
    }),
  };

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
      unsubscribed: rates7.unsubscribed,
    },
    unsubSafety: {
      explanation: formatUnsubSafetyExplanation({
        sent: rates7.sent,
        unsubscribed: rates7.unsubscribed,
        unsubRate: rates7.unsubRate,
      }),
      softRatePct: UNSUB_SAFETY_THRESHOLDS.softRate * 100,
      hardRatePct: UNSUB_SAFETY_THRESHOLDS.hardRate * 100,
      smallSampleAbsFloor: UNSUB_SAFETY_THRESHOLDS.smallSampleAbsFloor,
      rateOnlyMinSent: UNSUB_SAFETY_THRESHOLDS.rateOnlyMinSent,
    },
    replies: overall.replies,
    positiveReplies: positiveAll,
    signups: overall.signups,
    firstSends: overall.firstSends,
    paid: overall.paid,
    nextRamp: growthHealth.nextRamp,
    pauseReason: paused.reason,
    hardPause: control.hardPause,
    senderOk: sender.ok,
    senderDetail: sender.detail,
    imapConfigured: acquisitionImapConfigured(),
    autoApprove: acquisitionAutoApprove(),
    autoRamp: acquisitionAutoRamp(),
    lastTickAt: control.lastTickAt?.toISOString() ?? null,
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
    growthHealth,
    inventory,
    topIndustries: byCategory.map((r) => ({
      category: r.category,
      count: r._count,
    })),
    topCities: byCity.filter((r) => r.city).map((r) => ({ city: r.city, count: r._count })),
    recent,
    weekly,
    conversionOptimization,
  };
}
