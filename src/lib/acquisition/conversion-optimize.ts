/**
 * Rolling-cohort conversion optimization for Casey acquisition.
 * Holds all strategy/copy changes until ≥25 delivered INITIAL emails.
 * Then: report → diagnose ONE bottleneck (A–D) → apply ONE change.
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_COPY_VERSION,
  isCopyVersionId,
  type CopyVersionId,
} from "@/lib/acquisition/personalize";
import { ensurePipelineControl } from "@/lib/acquisition/caps";
import { alertOwnerException } from "@/lib/acquisition/notify";

export const COHORT_SIZE = 25;

export type Bottleneck = "A" | "B" | "C" | "D" | "NONE";

export type CohortRates = {
  delivered: number;
  clicked: number;
  replied: number;
  positiveReplied: number;
  signedUp: number;
  firstSend: number;
  paid: number;
  clickPct: number;
  replyPct: number;
  positiveReplyPct: number;
  signupPct: number;
  firstSendPct: number;
  paidPct: number;
};

export type SegmentScore = {
  key: string;
  vertical: string;
  signal: string;
  delivered: number;
  clicked: number;
  replied: number;
  signedUp: number;
  score: number;
};

export type ConversionOptimizationSnapshot = {
  last25: CohortRates;
  bestSegment: SegmentScore | null;
  worstSegment: SegmentScore | null;
  currentCopyVersion: string;
  nextAutoOptimization: string;
  status:
    | "WAITING_FOR_COHORT"
    | "HOLDING"
    | "APPLIED_COPY_AB"
    | "APPLIED_LANDING_FIX"
    | "APPLIED_ACTIVATION_FIX"
    | "APPLIED_PAID_FIX"
    | "BIAS_SEGMENTS";
  bottleneck: Bottleneck | null;
  preferredCategories: string[];
  preferredSignals: string[];
  totalDeliveredInitial: number;
  sampleNote: string;
  abTestActive: boolean;
};

export type OptState = {
  preferredCategories?: string[];
  preferredSignals?: string[];
  lastAction?: string;
  lastReason?: string;
  bestSegmentKey?: string;
  worstSegmentKey?: string;
  bottleneck?: Bottleneck;
  /** 50/50 A/B of controlled copy against v1a */
  abTest?: { control: "v1a"; variant: "v1b"; enabled: boolean };
  /** Gated product fixes — only one set per cohort eval */
  fixLandingUtm?: boolean;
  fixOnboardingReturn?: boolean;
  fixBillingBadgeValue?: boolean;
  lastReportAt?: string;
};

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

function signalForProspect(p: {
  newsletterPresent: boolean;
  eventsPromotionsPresent: boolean;
  competitorPlatform: string | null;
}): string {
  if (p.newsletterPresent) return "newsletter";
  if (p.eventsPromotionsPresent) return "events";
  if (p.competitorPlatform) return "competitor";
  return "category";
}

async function loadDeliveredInitial(limit: number) {
  return prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      step: "INITIAL",
      deliveredAt: { not: null },
      status: { in: ["DELIVERED", "SENT", "BOUNCED", "COMPLAINED"] },
    },
    orderBy: { deliveredAt: "desc" },
    take: limit,
    include: {
      prospect: {
        select: {
          id: true,
          category: true,
          city: true,
          newsletterPresent: true,
          eventsPromotionsPresent: true,
          competitorPlatform: true,
          landingPagePath: true,
          replyClass: true,
          signupAt: true,
          firstSendAt: true,
          paidAt: true,
          status: true,
        },
      },
    },
  });
}

function ratesFromMessages(
  msgs: Awaited<ReturnType<typeof loadDeliveredInitial>>
): CohortRates {
  const delivered = msgs.length;
  const clicked = msgs.filter((m) => m.clickedAt).length;
  const replied = msgs.filter((m) => Boolean(m.prospect.replyClass)).length;
  const positiveReplied = msgs.filter(
    (m) => m.prospect.replyClass === "POSITIVE" || m.prospect.replyClass === "QUESTION"
  ).length;
  const signedUp = msgs.filter((m) => Boolean(m.prospect.signupAt)).length;
  const firstSend = msgs.filter((m) => Boolean(m.prospect.firstSendAt)).length;
  const paid = msgs.filter((m) => Boolean(m.prospect.paidAt)).length;
  return {
    delivered,
    clicked,
    replied,
    positiveReplied,
    signedUp,
    firstSend,
    paid,
    clickPct: pct(clicked, delivered),
    replyPct: pct(replied, delivered),
    positiveReplyPct: pct(positiveReplied, delivered),
    signupPct: pct(signedUp, delivered),
    firstSendPct: pct(firstSend, delivered),
    paidPct: pct(paid, delivered),
  };
}

function scoreSegments(
  msgs: Awaited<ReturnType<typeof loadDeliveredInitial>>
): SegmentScore[] {
  const map = new Map<
    string,
    {
      vertical: string;
      signal: string;
      delivered: number;
      clicked: number;
      replied: number;
      signedUp: number;
    }
  >();

  for (const m of msgs) {
    const vertical = m.prospect.category || "unknown";
    const signal = signalForProspect(m.prospect);
    const key = `${vertical}+${signal}`;
    const row = map.get(key) || {
      vertical,
      signal,
      delivered: 0,
      clicked: 0,
      replied: 0,
      signedUp: 0,
    };
    row.delivered++;
    if (m.clickedAt) row.clicked++;
    if (m.prospect.replyClass) row.replied++;
    if (m.prospect.signupAt) row.signedUp++;
    map.set(key, row);
  }

  return [...map.entries()]
    .map(([key, r]) => ({
      key,
      vertical: r.vertical,
      signal: r.signal,
      delivered: r.delivered,
      clicked: r.clicked,
      replied: r.replied,
      signedUp: r.signedUp,
      score:
        r.delivered < 3
          ? -1
          : (r.clicked * 3 + r.replied * 4 + r.signedUp * 8) / r.delivered,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Primary funnel bottleneck — first matching gate wins (one diagnosis).
 * A MESSAGE/TARGETING | B LANDING/SIGNUP | C ACTIVATION | D PAID
 */
export function diagnoseBottleneck(rates: CohortRates): Bottleneck {
  if (rates.delivered < COHORT_SIZE) return "NONE";

  const engage = rates.clickPct + rates.replyPct;
  // Near-zero engagement → message/targeting
  if (engage < 2) return "A";
  // Clicks happen but signups weak
  if (rates.clickPct >= 2 && rates.signupPct < 1) return "B";
  // Signups happen but first sends weak
  if (rates.signupPct >= 1 && rates.firstSendPct < rates.signupPct * 0.5) return "C";
  // First sends happen but paid weak
  if (rates.firstSendPct >= 0.5 && rates.paidPct < rates.firstSendPct * 0.5) return "D";
  return "NONE";
}

export function formatCohortReport(
  rates: CohortRates,
  bottleneck: Bottleneck,
  action: string
): string {
  const label =
    bottleneck === "A"
      ? "A. MESSAGE / TARGETING"
      : bottleneck === "B"
        ? "B. LANDING / SIGNUP"
        : bottleneck === "C"
          ? "C. ACTIVATION"
          : bottleneck === "D"
            ? "D. PAID CONVERSION"
            : "NONE (hold)";

  return [
    "SendFable acquisition — first rolling cohort (25 DELIVERED INITIAL)",
    "",
    `DELIVERED: ${rates.delivered}`,
    `CLICKS: ${rates.clicked}`,
    `CLICK RATE: ${rates.clickPct}%`,
    `REPLIES: ${rates.replied}`,
    `REPLY RATE: ${rates.replyPct}%`,
    `POSITIVE REPLIES: ${rates.positiveReplied}`,
    `SIGNUPS: ${rates.signedUp}`,
    `SIGNUP RATE: ${rates.signupPct}%`,
    `FIRST SENDS: ${rates.firstSend}`,
    `PAID: ${rates.paid}`,
    "",
    `PRIMARY BOTTLENECK: ${label}`,
    `AUTO ACTION (one change): ${action}`,
    "",
    "OWNER ACTION: NONE",
  ].join("\n");
}

function nextActionText(
  rates: CohortRates,
  copyVersion: string,
  bottleneck: Bottleneck | null
): string {
  if (rates.delivered < COHORT_SIZE) {
    return `Hold all copy/targeting/ramp changes until ${COHORT_SIZE} delivered INITIAL (now ${rates.delivered}).`;
  }
  if (bottleneck === "A") {
    return `A/B test v1b (subject/CTA only) against ${copyVersion || "v1a"} — 50/50 on new INITIAL drafts.`;
  }
  if (bottleneck === "B") {
    return "Enable landing→signup UTM preservation fix (single friction).";
  }
  if (bottleneck === "C") {
    return "Enable onboarding return after sender verify (single activation friction).";
  }
  if (bottleneck === "D") {
    return "Enable Free→paid 'No platform badge' value line on billing (single paid friction).";
  }
  return "Hold copy; soft-prefer better segments with exploration.";
}

async function readOptState(): Promise<{
  copyVersion: string;
  state: OptState;
}> {
  const control = await ensurePipelineControl();
  const copyVersion =
    (control as { activeCopyVersion?: string }).activeCopyVersion || DEFAULT_COPY_VERSION;
  const state = ((control as { optimizationState?: OptState }).optimizationState ||
    {}) as OptState;
  return { copyVersion, state };
}

export async function getActiveCopyVersion(): Promise<CopyVersionId> {
  const { copyVersion, state } = await readOptState();
  if (state.abTest?.enabled) {
    // Stable-enough 50/50 without depending on prospect id at draft time
    return Math.random() < 0.5 ? state.abTest.control : state.abTest.variant;
  }
  return isCopyVersionId(copyVersion) ? copyVersion : DEFAULT_COPY_VERSION;
}

export async function getPreferredDiscoveryBias(): Promise<{
  categories: string[];
  signals: string[];
}> {
  const { state } = await readOptState();
  // Never bias discovery until first cohort completes
  const total = await prisma.acquisitionMessage.count({
    where: { dryRun: false, step: "INITIAL", deliveredAt: { not: null } },
  });
  if (total < COHORT_SIZE) return { categories: [], signals: [] };
  return {
    categories: state.preferredCategories || [],
    signals: state.preferredSignals || [],
  };
}

/** Product-fix gates — false until cohort eval enables exactly one. */
export async function getConversionFixFlags(): Promise<{
  fixLandingUtm: boolean;
  fixOnboardingReturn: boolean;
  fixBillingBadgeValue: boolean;
}> {
  const { state } = await readOptState();
  return {
    fixLandingUtm: Boolean(state.fixLandingUtm),
    fixOnboardingReturn: Boolean(state.fixOnboardingReturn),
    fixBillingBadgeValue: Boolean(state.fixBillingBadgeValue),
  };
}

export async function getConversionOptimizationSnapshot(): Promise<ConversionOptimizationSnapshot> {
  const { copyVersion, state } = await readOptState();

  const totalDeliveredInitial = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      step: "INITIAL",
      deliveredAt: { not: null },
    },
  });

  const last25msgs = await loadDeliveredInitial(COHORT_SIZE);
  const last25 = ratesFromMessages(last25msgs);
  const segments = scoreSegments(last25msgs);
  const usable = segments.filter((s) => s.delivered >= 3 && s.score >= 0);
  const bestSegment =
    totalDeliveredInitial >= COHORT_SIZE ? usable[0] || null : null;
  const worstSegment =
    totalDeliveredInitial >= COHORT_SIZE && usable.length > 1
      ? usable[usable.length - 1]!
      : null;

  const bottleneck =
    totalDeliveredInitial >= COHORT_SIZE
      ? state.bottleneck || diagnoseBottleneck(last25)
      : null;

  let status: ConversionOptimizationSnapshot["status"] = "WAITING_FOR_COHORT";
  if (totalDeliveredInitial >= COHORT_SIZE) {
    switch (state.lastAction) {
      case "copy_ab":
        status = "APPLIED_COPY_AB";
        break;
      case "landing_fix":
        status = "APPLIED_LANDING_FIX";
        break;
      case "activation_fix":
        status = "APPLIED_ACTIVATION_FIX";
        break;
      case "paid_fix":
        status = "APPLIED_PAID_FIX";
        break;
      case "bias_segments":
        status = "BIAS_SEGMENTS";
        break;
      default:
        status = "HOLDING";
    }
  }

  return {
    last25,
    bestSegment,
    worstSegment,
    currentCopyVersion: state.abTest?.enabled
      ? `A/B ${state.abTest.control} vs ${state.abTest.variant}`
      : copyVersion,
    nextAutoOptimization: nextActionText(last25, copyVersion, bottleneck),
    status,
    bottleneck,
    preferredCategories: state.preferredCategories || [],
    preferredSignals: state.preferredSignals || [],
    totalDeliveredInitial,
    sampleNote:
      totalDeliveredInitial < COHORT_SIZE
        ? `HOLD: ${totalDeliveredInitial}/${COHORT_SIZE} delivered INITIAL — no copy, targeting, or ramp changes.`
        : `Cohort ready — last ${Math.min(COHORT_SIZE, last25.delivered)} delivered INITIAL.`,
    abTestActive: Boolean(state.abTest?.enabled),
  };
}

/**
 * Autonomous cohort eval — no strategy changes before 25 delivered INITIAL.
 * At each +25 milestone: report, diagnose ONE bottleneck, apply ONE change.
 */
export async function evaluateConversionCohort(now = new Date()): Promise<{
  evaluated: boolean;
  action: string;
}> {
  const control = await ensurePipelineControl();
  const totalDelivered = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      step: "INITIAL",
      deliveredAt: { not: null },
    },
  });

  const lastEvalCount =
    (control as { lastCohortEvalDelivered?: number }).lastCohortEvalDelivered ?? 0;

  if (totalDelivered < COHORT_SIZE) {
    return {
      evaluated: false,
      action: `waiting_cohort:${totalDelivered}/${COHORT_SIZE}`,
    };
  }

  if (totalDelivered - lastEvalCount < COHORT_SIZE && lastEvalCount > 0) {
    return {
      evaluated: false,
      action: `hold_until_next_cohort:${totalDelivered - lastEvalCount}/${COHORT_SIZE}`,
    };
  }

  const msgs = await loadDeliveredInitial(COHORT_SIZE);
  const rates = ratesFromMessages(msgs);
  const segments = scoreSegments(msgs).filter((s) => s.delivered >= 3);
  const best = segments[0] || null;
  const worst = segments.length > 1 ? segments[segments.length - 1]! : null;
  const bottleneck = diagnoseBottleneck(rates);

  const prevState = ((control as { optimizationState?: OptState }).optimizationState ||
    {}) as OptState;

  let action = "hold";
  let reason = "no_bottleneck_hold";
  const state: OptState = {
    ...prevState,
    preferredCategories: [],
    preferredSignals: [],
    bottleneck,
    bestSegmentKey: best?.key,
    worstSegmentKey: worst?.key,
    // Clear prior single-fix flags — only one may be set below
    abTest: { control: "v1a", variant: "v1b", enabled: false },
    fixLandingUtm: false,
    fixOnboardingReturn: false,
    fixBillingBadgeValue: false,
  };

  // Exactly one change
  if (bottleneck === "A") {
    state.abTest = { control: "v1a", variant: "v1b", enabled: true };
    action = "copy_ab";
    reason = "A/B v1b subject/CTA vs v1a (50/50 new INITIAL drafts)";
  } else if (bottleneck === "B") {
    state.fixLandingUtm = true;
    action = "landing_fix";
    reason = "preserve casey UTMs on MarketingCta → /signup";
  } else if (bottleneck === "C") {
    state.fixOnboardingReturn = true;
    action = "activation_fix";
    reason = "return to onboarding after sender verify";
  } else if (bottleneck === "D") {
    state.fixBillingBadgeValue = true;
    action = "paid_fix";
    reason = "show No platform badge on paid billing cards";
  } else if (best) {
    state.preferredCategories = [best.vertical];
    state.preferredSignals = [best.signal];
    action = "bias_segments";
    reason = `prefer ${best.key} with exploration; soft-deprioritize ${worst?.key || "n/a"}`;
  }

  state.lastAction = action;
  state.lastReason = reason;
  state.lastReportAt = now.toISOString();

  const report = formatCohortReport(rates, bottleneck, `${action}: ${reason}`);

  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: {
      // Keep baseline v1a as control; AB handled in getActiveCopyVersion
      activeCopyVersion: "v1a",
      lastCohortEvalAt: now,
      lastCohortEvalDelivered: totalDelivered,
      optimizationState: state as object,
    },
  });

  await prisma.acquisitionEvent.create({
    data: {
      type: "conversion_cohort_report",
      meta: {
        rates,
        bottleneck,
        action,
        reason,
        best: best?.key ?? null,
        worst: worst?.key ?? null,
        deliveredTotal: totalDelivered,
        report,
      },
    },
  });

  // Informational milestone report — not an owner to-do
  await alertOwnerException(
    "SendFable acquisition cohort report (25 delivered INITIAL)",
    report
  );

  return { evaluated: true, action: `${bottleneck}:${action}:${reason}` };
}
