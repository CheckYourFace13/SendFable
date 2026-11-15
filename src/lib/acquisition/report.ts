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
import { capsForStage } from "@/lib/acquisition/flags";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import { prisma } from "@/lib/prisma";
import { trackComparisonLines } from "@/lib/acquisition/website-demo/metrics";
import {
  WEBSITE_DEMO_COPY_VERSION,
  WEBSITE_DEMO_DAILY_NEW_LIMIT,
} from "@/lib/acquisition/queue-policy";

const REPORT_TZ = "America/Chicago";
/** Legacy daily gate (kept for tests / admin day builders). Owner summary is weekly. */
const REPORT_AFTER_HOUR_CHICAGO = 16;
/** Owner weekly acquisition summary: Friday 6:00 PM America/Chicago. */
const WEEKLY_REPORT_WEEKDAY_CHICAGO = 5; // Friday
const WEEKLY_REPORT_HOUR_CHICAGO = 18;

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

function weekdayInChicago(d: Date): number {
  // 0=Sun … 6=Sat
  const w = new Intl.DateTimeFormat("en-US", { timeZone: REPORT_TZ, weekday: "short" }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? d.getUTCDay();
}

/** True on Friday at/after 18:00 America/Chicago. */
export function isPastChicagoWeeklyReportSlot(now = new Date()): boolean {
  const p = chicagoParts(now);
  if (weekdayInChicago(now) !== WEEKLY_REPORT_WEEKDAY_CHICAGO) return false;
  return p.hour > WEEKLY_REPORT_HOUR_CHICAGO || (p.hour === WEEKLY_REPORT_HOUR_CHICAGO && p.minute >= 0);
}

/** Start of the Chicago calendar day that is `daysBack` days before `now`'s Chicago day. */
export function startOfChicagoDayDaysBack(now: Date, daysBack: number): Date {
  const key = chicagoDateKey(now);
  const [y, m, day] = key.split("-").map(Number) as [number, number, number];
  // Approximate then snap via startOfChicagoDay
  const approx = new Date(Date.UTC(y, m - 1, day) - daysBack * 24 * 3600_000);
  // Walk until Chicago dateKey is exactly daysBack earlier
  const targetParts = chicagoParts(now);
  const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
  const want = new Date(targetUtc - daysBack * 24 * 3600_000);
  return startOfChicagoDay(want);
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
  const stageChangesToday = await prisma.acquisitionEvent.findMany({
    where: {
      type: { in: ["stage_reduced", "stage_ramped", "stage_set"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { type: true, meta: true, createdAt: true },
    take: 10,
  });
  const firstStageChange = stageChangesToday[0] || null;
  const lastStageChange = stageChangesToday[stageChangesToday.length - 1] || null;
  const firstMeta = (firstStageChange?.meta || null) as {
    from?: number;
    to?: number;
    stage?: number;
    reason?: string;
  } | null;
  const lastMeta = (lastStageChange?.meta || null) as {
    from?: number;
    to?: number;
    stage?: number;
    reason?: string;
  } | null;
  const dayStartStage =
    typeof firstMeta?.from === "number"
      ? firstMeta.from
      : typeof firstMeta?.stage === "number"
        ? firstMeta.stage
        : stageCaps.stage;
  const baseCaps = capsForStage(dayStartStage);
  const { getInventoryHealth } = await import("@/lib/acquisition/discovery/inventory");
  const inventory = await getInventoryHealth();
  const { getConversionOptimizationSnapshot } = await import(
    "@/lib/acquisition/conversion-optimize"
  );
  const conversion = await getConversionOptimizationSnapshot().catch(() => null);
  const abWinner =
    (conversion as { currentCopyVersion?: string } | null)?.currentCopyVersion ||
    "utility_signup → /try/signup-tool";
  const rates7 = await ratesOverDays(7);
  const softBackoffActive =
    stageChangesToday.some((e) => e.type === "stage_reduced") ||
    (rates7.sent >= 20 && (rates7.bounceRate > 0.02 || rates7.unsubRate > 0.02));
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

  const stageTransitionLine = lastStageChange
    ? `Stage change today: ${lastStageChange.type} ${
        typeof lastMeta?.from === "number" && typeof lastMeta?.to === "number"
          ? `${lastMeta.from}→${lastMeta.to}`
          : ""
      }${lastMeta?.reason ? ` (${lastMeta.reason})` : ""} at ${lastStageChange.createdAt.toISOString()}`
    : "Stage change today: none";

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
    `BASE STAGE (start of Chicago day / pre-change): ${dayStartStage}`,
    `BASE NEW CAP: ${baseCaps.newPerDay}`,
    `BASE TOTAL CAP: ${baseCaps.totalPerDay}`,
    `CURRENT EFFECTIVE STAGE: ${stageCaps.stage}`,
    `CURRENT EFFECTIVE NEW CAP: ${stageCaps.newPerDay}`,
    `CURRENT EFFECTIVE TOTAL CAP: ${stageCaps.totalPerDay}`,
    `SOFT BACKOFF: ${softBackoffActive ? "ACTIVE" : "INACTIVE"}`,
    stageTransitionLine,
    `Personalized demo cap: ${WEBSITE_DEMO_DAILY_NEW_LIMIT}/day (separate; does not consume Casey cap)`,
    `Combined new capacity (effective): ${stageCaps.newPerDay + WEBSITE_DEMO_DAILY_NEW_LIMIT}/day`,
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

/**
 * Daily owner acquisition emails are DISABLED.
 * Use sendWeeklyAcquisitionReportIfDue (Friday 6pm America/Chicago).
 * Critical/ops alerts still go through notify.ts immediately.
 */
export async function sendDailyAcquisitionReportIfDue(): Promise<{
  sent: boolean;
  reason?: string;
}> {
  return { sent: false, reason: "daily_disabled_use_weekly" };
}

export async function buildWeeklyAcquisitionReport(now = new Date()): Promise<{
  subject: string;
  body: string;
  rangeLabel: string;
}> {
  const endKey = chicagoDateKey(now);
  const since = startOfChicagoDayDaysBack(now, 6);
  const startKey = chicagoDateKey(since);
  const rangeLabel = `${startKey} → ${endKey}`;

  const discovered = await prisma.acquisitionEvent.count({
    where: { type: { in: ["discovered", "discovered_new"] }, createdAt: { gte: since } },
  });
  const qualified = await prisma.acquisitionProspect.count({
    where: {
      status: { in: ["QUALIFIED", "QUEUED"] },
      updatedAt: { gte: since },
      sourceKind: { not: "seed_catalog" },
    },
  });
  const newOutreach = await prisma.acquisitionMessage.count({
    where: {
      step: "INITIAL",
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
  });
  const delivered = await prisma.acquisitionMessage.count({
    where: { dryRun: false, deliveredAt: { gte: since } },
  });
  const bounced = await prisma.acquisitionMessage.count({
    where: { dryRun: false, bounceAt: { gte: since } },
  });
  const unsubscribed = await prisma.acquisitionProspect.count({
    where: { status: "UNSUBSCRIBED", updatedAt: { gte: since } },
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
  const tryVisits = await prisma.acquisitionEvent.count({
    where: { type: "try_page_view", createdAt: { gte: since } },
  });
  const demoCompletions = await prisma.acquisitionEvent.count({
    where: {
      type: { in: ["demo_signup_success", "make_live_clicked"] },
      createdAt: { gte: since },
    },
  });
  const makeLive = await prisma.acquisitionEvent.count({
    where: { type: "make_live_clicked", createdAt: { gte: since } },
  });
  const signups = await prisma.acquisitionEvent.count({
    where: { type: { in: ["signup_matched", "signup_completed"] }, createdAt: { gte: since } },
  });
  const realTools = await prisma.acquisitionEvent.count({
    where: { type: "real_signup_tool_created", createdAt: { gte: since } },
  });
  const firstSends = await prisma.acquisitionProspect.count({
    where: { firstSendAt: { gte: since } },
  });
  const paid = await prisma.acquisitionProspect.count({
    where: { paidAt: { gte: since } },
  });

  const { getInventoryHealth } = await import("@/lib/acquisition/discovery/inventory");
  const inventory = await getInventoryHealth(now);
  // Approximate beginning inventory: current + new outreach − new qualified (coarse)
  const beginningSendable = Math.max(0, inventory.sendableInventory + newOutreach - qualified);

  const stageCaps = await getStageCaps();
  const baseCaps = capsForStage(stageCaps.stage);
  const rates7 = await ratesOverDays(7);
  const softBackoffActive =
    rates7.sent >= 20 && (rates7.bounceRate > 0.02 || rates7.unsubRate > 0.02);
  const paused = await isPipelinePaused();

  const weekendNote =
    "Outreach schedule: Monday–Friday local business hours only. Saturday/Sunday 0 sends are EXPECTED, not a failure.";

  const clickPct = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : "n/a";
  const tryPct = clicks > 0 ? ((tryVisits / clicks) * 100).toFixed(1) : "n/a";
  const signupPct = tryVisits > 0 ? ((signups / tryVisits) * 100).toFixed(1) : "n/a";
  const firstPct = signups > 0 ? ((firstSends / signups) * 100).toFixed(1) : "n/a";
  const paidPct = firstSends > 0 ? ((paid / firstSends) * 100).toFixed(1) : "n/a";

  let bottleneck = "Insufficient weekly volume to name a new bottleneck.";
  if (discovered === 0 && qualified === 0) {
    bottleneck = "Discovery idle or no new qualified domains this week.";
  } else if (delivered > 0 && clicks === 0) {
    bottleneck = `Delivered→Click (0/${delivered} clicks).`;
  } else if (clicks > 0 && tryVisits === 0) {
    bottleneck = `Click→Try (0 try visits after ${clicks} clicks).`;
  } else if (tryVisits > 0 && signups === 0) {
    bottleneck = `Try→Signup (0 signups after ${tryVisits} try visits).`;
  } else if (signups > 0 && firstSends === 0) {
    bottleneck = `Signup→First Send (0 first sends after ${signups} signups).`;
  } else if (firstSends > 0 && paid === 0) {
    bottleneck = `First Send→Paid (0 paid after ${firstSends} first sends).`;
  }

  const body = [
    `SendFable Weekly Acquisition — ${rangeLabel} (America/Chicago)`,
    weekendNote,
    "",
    `NEW PROSPECTS DISCOVERED: ${discovered}`,
    `QUALIFIED: ${qualified}`,
    `NEW OUTREACH: ${newOutreach}`,
    `DELIVERED: ${delivered}`,
    `BOUNCED: ${bounced}`,
    `UNSUBSCRIBED: ${unsubscribed}`,
    `CLICKS: ${clicks}`,
    `REPLIES: ${replies}`,
    `POSITIVE REPLIES: ${positive}`,
    `TRY PAGE VISITS: ${tryVisits}`,
    `DEMO COMPLETIONS: ${demoCompletions}`,
    `MAKE LIVE CLICKS: ${makeLive}`,
    `SIGNUPS: ${signups}`,
    `REAL SIGNUP TOOLS CREATED: ${realTools}`,
    `FIRST SENDS: ${firstSends}`,
    `PAID CUSTOMERS: ${paid}`,
    "",
    `Beginning sendable inventory (approx): ${beginningSendable}`,
    `Ending sendable inventory: ${inventory.sendableInventory}`,
    `Current acquisition stage: ${stageCaps.stage}`,
    `Base cap (new/day): ${baseCaps.newPerDay}`,
    `Effective cap (new/day): ${stageCaps.newPerDay}`,
    `Safety/backoff: ${paused.paused ? `PAUSED (${paused.reason || "—"})` : softBackoffActive ? "SOFT BACKOFF ACTIVE" : "INACTIVE"}`,
    `7D safety: ${rates7.sent} sends, ${rates7.unsubscribed} unsubs, ${rates7.bounced} bounces`,
    "",
    "FUNNEL",
    `Delivered → Click → Try → Signup → First Send → Paid`,
    `${delivered} → ${clicks} (${clickPct}%) → ${tryVisits} (${tryPct}%) → ${signups} (${signupPct}%) → ${firstSends} (${firstPct}%) → ${paid} (${paidPct}%)`,
    "",
    `BIGGEST BOTTLENECK: ${bottleneck}`,
    "",
    "SYSTEM ACTION THIS WEEK:",
    "(filled by operator notes / deploy changelog when present)",
    "",
    "OWNER ACTION: NONE unless genuinely needed",
  ].join("\n");

  return {
    subject: `SendFable Weekly Acquisition — ${rangeLabel}`,
    body,
    rangeLabel,
  };
}

export async function sendWeeklyAcquisitionReportIfDue(): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const control = await ensurePipelineControl();
  const now = new Date();

  if (!isPastChicagoWeeklyReportSlot(now)) {
    return { sent: false, reason: "not_friday_after_18h_chicago" };
  }

  const fridayKey = chicagoDateKey(now);
  if (control.lastDailyReportAt) {
    // Reuse lastDailyReportAt as last weekly send marker (same Friday key = already sent).
    const lastKey = chicagoDateKey(control.lastDailyReportAt);
    if (lastKey === fridayKey) {
      return { sent: false, reason: "already_sent_this_friday" };
    }
  }

  const to = acquisitionOwnerAlertEmail();
  if (!to) return { sent: false, reason: "no_alert_email" };

  const built = await buildWeeklyAcquisitionReport(now);
  await sendEmail({
    from: platformFrom("SendFable Acquisition"),
    to,
    subject: built.subject,
    text: built.body,
    html: `<pre style="font-family:monospace;font-size:13px;">${built.body.replace(/</g, "&lt;")}</pre>`,
    tags: { kind: "acquisition_weekly_report" },
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
