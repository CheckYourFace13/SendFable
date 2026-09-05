/**
 * Rolling-cohort conversion optimization for Casey acquisition.
 * Evaluates only after ≥25 delivered INITIAL emails; applies small controlled changes.
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_COPY_VERSION,
  isCopyVersionId,
  nextCopyVersion,
  type CopyVersionId,
} from "@/lib/acquisition/personalize";
import { ensurePipelineControl } from "@/lib/acquisition/caps";

export const COHORT_SIZE = 25;

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
  status: "WAITING_FOR_COHORT" | "HOLDING" | "APPLIED_COPY_ROTATION" | "BIAS_SEGMENTS";
  preferredCategories: string[];
  preferredSignals: string[];
  totalDeliveredInitial: number;
  sampleNote: string;
};

type OptState = {
  preferredCategories?: string[];
  preferredSignals?: string[];
  lastAction?: string;
  lastReason?: string;
  bestSegmentKey?: string;
  worstSegmentKey?: string;
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
      // Prefer engagement with enough sample; tiny n deprioritized
      score:
        r.delivered < 3
          ? -1
          : (r.clicked * 3 + r.replied * 4 + r.signedUp * 8) / r.delivered,
    }))
    .sort((a, b) => b.score - a.score);
}

function nextActionText(rates: CohortRates, copyVersion: string): string {
  if (rates.delivered < COHORT_SIZE) {
    return `Wait until ${COHORT_SIZE} delivered INITIAL emails (now ${rates.delivered}). No copy/strategy change.`;
  }
  const engage = rates.clickPct + rates.replyPct;
  if (engage < 2) {
    return `If next cohort still <2% click+reply, rotate copy ${copyVersion} → ${nextCopyVersion(copyVersion)} (subject/CTA only).`;
  }
  if (rates.clickPct >= 2 && rates.signupPct < 1) {
    return "Inspect landing/signup friction if clicks persist without signups (no wild copy rewrite).";
  }
  if (rates.signupPct >= 1 && rates.firstSendPct < 0.5) {
    return "Improve onboarding/activation if signups occur without first sends.";
  }
  if (rates.firstSendPct >= 0.5 && rates.paidPct < 0.5) {
    return "Review upgrade timing/value presentation if first sends occur without paid.";
  }
  return "Hold current copy; keep preferring better segments with exploration.";
}

export async function getActiveCopyVersion(): Promise<CopyVersionId> {
  const control = await ensurePipelineControl();
  const v = (control as { activeCopyVersion?: string }).activeCopyVersion;
  return isCopyVersionId(v) ? v : DEFAULT_COPY_VERSION;
}

export async function getPreferredDiscoveryBias(): Promise<{
  categories: string[];
  signals: string[];
}> {
  const control = await ensurePipelineControl();
  const state = ((control as { optimizationState?: OptState }).optimizationState ||
    {}) as OptState;
  return {
    categories: state.preferredCategories || [],
    signals: state.preferredSignals || [],
  };
}

/**
 * Dashboard + admin snapshot. Does not mutate strategy when under cohort size.
 */
export async function getConversionOptimizationSnapshot(): Promise<ConversionOptimizationSnapshot> {
  const control = await ensurePipelineControl();
  const copyVersion =
    (control as { activeCopyVersion?: string }).activeCopyVersion || DEFAULT_COPY_VERSION;
  const state = ((control as { optimizationState?: OptState }).optimizationState ||
    {}) as OptState;

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

  let status: ConversionOptimizationSnapshot["status"] = "WAITING_FOR_COHORT";
  if (totalDeliveredInitial >= COHORT_SIZE) {
    status =
      state.lastAction === "copy_rotation"
        ? "APPLIED_COPY_ROTATION"
        : state.lastAction === "bias_segments"
          ? "BIAS_SEGMENTS"
          : "HOLDING";
  }

  return {
    last25,
    bestSegment,
    worstSegment,
    currentCopyVersion: copyVersion,
    nextAutoOptimization: nextActionText(last25, copyVersion),
    status,
    preferredCategories: state.preferredCategories || [],
    preferredSignals: state.preferredSignals || [],
    totalDeliveredInitial,
    sampleNote:
      totalDeliveredInitial < COHORT_SIZE
        ? `Statistical caution: only ${totalDeliveredInitial}/${COHORT_SIZE} delivered INITIAL — do not rewrite strategy yet.`
        : `Evaluating on rolling last ${Math.min(COHORT_SIZE, last25.delivered)} delivered INITIAL.`,
  };
}

/**
 * Autonomous cohort eval — call from worker tick.
 * Applies at most one small change per full cohort step of 25.
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

  // Evaluate every additional 25 delivered since last eval
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

  let copyVersion =
    (control as { activeCopyVersion?: string }).activeCopyVersion || DEFAULT_COPY_VERSION;
  let action = "hold";
  let reason = "engagement_ok_or_insufficient_signal";

  const engage = rates.clickPct + rates.replyPct;
  if (engage < 2 && rates.delivered >= COHORT_SIZE) {
    const next = nextCopyVersion(copyVersion);
    if (next !== copyVersion) {
      copyVersion = next;
      action = "copy_rotation";
      reason = `click+reply ${engage}% near zero — rotate subject/CTA to ${next}`;
    }
  }

  const preferredCategories = best ? [best.vertical] : [];
  const preferredSignals = best ? [best.signal] : [];
  if (best && action === "hold") {
    action = "bias_segments";
    reason = `prefer ${best.key} with exploration; deprioritize ${worst?.key || "n/a"}`;
  }

  const state: OptState = {
    preferredCategories,
    preferredSignals,
    lastAction: action,
    lastReason: reason,
    bestSegmentKey: best?.key,
    worstSegmentKey: worst?.key,
  };

  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: {
      activeCopyVersion: copyVersion,
      lastCohortEvalAt: now,
      lastCohortEvalDelivered: totalDelivered,
      optimizationState: state as object,
    },
  });

  await prisma.acquisitionEvent.create({
    data: {
      type: "conversion_cohort_eval",
      meta: {
        rates,
        action,
        reason,
        copyVersion,
        best: best?.key ?? null,
        worst: worst?.key ?? null,
        delivered: totalDelivered,
      },
    },
  });

  return { evaluated: true, action: `${action}:${reason}` };
}
