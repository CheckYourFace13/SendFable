import { prisma } from "@/lib/prisma";
import {
  ACQUISITION_MAX_STAGE,
  ACQUISITION_MIN_BUSINESS_DAYS_PER_STAGE,
  acquisitionAutoRamp,
  acquisitionRampStageFromEnv,
  capsForStage,
} from "@/lib/acquisition/flags";
import { alertOwnerException } from "@/lib/acquisition/notify";

export type SafetyRates = {
  sent: number;
  bounceRate: number;
  complaintRate: number;
  unsubRate: number;
  sampleOk: boolean;
};

const HARD_COMPLAINT = 0.001;
const HARD_BOUNCE = 0.05;
const HARD_UNSUB = 0.05;
const SOFT_BOUNCE = 0.02;
const SOFT_UNSUB = 0.02;
const RAMP_COMPLAINT_MAX = 0.0005;
const RAMP_BOUNCE_MAX = 0.02;
const RAMP_UNSUB_MAX = 0.02;
const MIN_SAMPLE_FOR_RAMP = 30;
const MIN_SAMPLE_FOR_HARD = 20;

async function ensureControl() {
  return prisma.acquisitionPipelineControl.upsert({
    where: { id: "default" },
    create: { id: "default", rampStage: 1, stageEnteredAt: new Date() },
    update: {},
  });
}

export async function ratesOverDays(days: number): Promise<SafetyRates> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const msgs = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
    select: { status: true },
  });
  const sent = msgs.length;
  if (sent === 0) {
    return { sent: 0, bounceRate: 0, complaintRate: 0, unsubRate: 0, sampleOk: false };
  }
  const bounced = msgs.filter((m) => m.status === "BOUNCED").length;
  const complained = msgs.filter((m) => m.status === "COMPLAINED").length;
  const unsubs = await prisma.acquisitionProspect.count({
    where: { status: "UNSUBSCRIBED", updatedAt: { gte: since } },
  });
  return {
    sent,
    bounceRate: bounced / sent,
    complaintRate: complained / sent,
    unsubRate: unsubs / sent,
    sampleOk: sent >= MIN_SAMPLE_FOR_HARD,
  };
}

export async function getEffectiveRampStage(): Promise<number> {
  const control = await ensureControl();
  if (typeof control.rampStage === "number" && control.rampStage >= 1) {
    return Math.min(ACQUISITION_MAX_STAGE, control.rampStage);
  }
  return acquisitionRampStageFromEnv();
}

export async function getStageCaps(): Promise<{
  stage: number;
  newPerDay: number;
  totalPerDay: number;
}> {
  const stage = await getEffectiveRampStage();
  return { stage, ...capsForStage(stage) };
}

function businessDaysBetween(a: Date, b: Date): number {
  let days = 0;
  const cur = new Date(a.getTime());
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(b.getTime());
  end.setUTCHours(0, 0, 0, 0);
  while (cur < end) {
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6) days++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export async function hardPauseAcquisition(reason: string): Promise<void> {
  await ensureControl();
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { paused: true, pauseReason: reason, hardPause: true },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "hard_pause", meta: { reason } },
  });
  await alertOwnerException(
    `SendFable acquisition HARD PAUSE: ${reason}`,
    `Acquisition sending was hard-paused.\n\nReason: ${reason}\n\nResume only from /admin/acquisition after you investigate.`
  );
}

export async function reduceStage(reason: string): Promise<number> {
  const stage = await getEffectiveRampStage();
  const next = Math.max(1, stage - 1);
  if (next === stage) return stage;
  await ensureControl();
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { rampStage: next, stageEnteredAt: new Date() },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "stage_reduced", meta: { from: stage, to: next, reason } },
  });
  return next;
}

export async function evaluateSafetyPauseAndBackoff(): Promise<{
  ok: boolean;
  hardPaused: boolean;
  stage: number;
  rates: SafetyRates;
}> {
  const rates7 = await ratesOverDays(7);
  const stage = await getEffectiveRampStage();

  if (rates7.sent >= MIN_SAMPLE_FOR_HARD) {
    if (rates7.complaintRate >= HARD_COMPLAINT) {
      await hardPauseAcquisition(`complaint_rate_${(rates7.complaintRate * 100).toFixed(3)}%`);
      return { ok: false, hardPaused: true, stage, rates: rates7 };
    }
    if (rates7.bounceRate >= HARD_BOUNCE) {
      await hardPauseAcquisition(`bounce_rate_${(rates7.bounceRate * 100).toFixed(2)}%`);
      return { ok: false, hardPaused: true, stage, rates: rates7 };
    }
    if (rates7.unsubRate >= HARD_UNSUB) {
      await hardPauseAcquisition(`unsub_rate_${(rates7.unsubRate * 100).toFixed(2)}%`);
      return { ok: false, hardPaused: true, stage, rates: rates7 };
    }
    if (rates7.bounceRate > SOFT_BOUNCE || rates7.unsubRate > SOFT_UNSUB) {
      await reduceStage(
        rates7.bounceRate > SOFT_BOUNCE
          ? `soft_bounce_${(rates7.bounceRate * 100).toFixed(2)}%`
          : `soft_unsub_${(rates7.unsubRate * 100).toFixed(2)}%`
      );
    }
  }

  return { ok: true, hardPaused: false, stage: await getEffectiveRampStage(), rates: rates7 };
}

export type RampEval = {
  stage: number;
  eligible: boolean;
  reason: string;
  nextStage: number | null;
  businessDaysInStage: number;
  rates: SafetyRates;
};

export async function evaluateAutoRamp(now = new Date()): Promise<RampEval> {
  const control = await ensureControl();
  const stage = await getEffectiveRampStage();
  const rates = await ratesOverDays(7);
  const entered = control.stageEnteredAt || control.updatedAt;
  const bizDays = businessDaysBetween(entered, now);

  if (!acquisitionAutoRamp()) {
    return {
      stage,
      eligible: false,
      reason: "auto_ramp_disabled",
      nextStage: null,
      businessDaysInStage: bizDays,
      rates,
    };
  }
  if (stage >= ACQUISITION_MAX_STAGE) {
    return {
      stage,
      eligible: false,
      reason: "max_stage",
      nextStage: null,
      businessDaysInStage: bizDays,
      rates,
    };
  }
  if (bizDays < ACQUISITION_MIN_BUSINESS_DAYS_PER_STAGE) {
    return {
      stage,
      eligible: false,
      reason: `need_${ACQUISITION_MIN_BUSINESS_DAYS_PER_STAGE}_business_days`,
      nextStage: stage + 1,
      businessDaysInStage: bizDays,
      rates,
    };
  }
  if (rates.sent < MIN_SAMPLE_FOR_RAMP) {
    return {
      stage,
      eligible: false,
      reason: `sample_too_small_${rates.sent}`,
      nextStage: stage + 1,
      businessDaysInStage: bizDays,
      rates,
    };
  }
  if (
    rates.complaintRate >= RAMP_COMPLAINT_MAX ||
    rates.bounceRate >= RAMP_BOUNCE_MAX ||
    rates.unsubRate >= RAMP_UNSUB_MAX
  ) {
    return {
      stage,
      eligible: false,
      reason: "health_gate",
      nextStage: stage + 1,
      businessDaysInStage: bizDays,
      rates,
    };
  }

  const next = stage + 1;
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { rampStage: next, stageEnteredAt: now, lastRampEvalAt: now },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "stage_ramped", meta: { from: stage, to: next } },
  });
  return {
    stage: next,
    eligible: true,
    reason: "ramped",
    nextStage: next < ACQUISITION_MAX_STAGE ? next + 1 : null,
    businessDaysInStage: 0,
    rates,
  };
}

export async function setRampStage(stage: number, reason: string): Promise<void> {
  const s = Math.min(ACQUISITION_MAX_STAGE, Math.max(1, stage));
  await ensureControl();
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { rampStage: s, stageEnteredAt: new Date() },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "stage_set", meta: { stage: s, reason } },
  });
}

export function canRampGiven(opts: {
  autoRamp: boolean;
  stage: number;
  businessDaysInStage: number;
  sent: number;
  bounceRate: number;
  complaintRate: number;
  unsubRate: number;
}): { eligible: boolean; reason: string } {
  if (!opts.autoRamp) return { eligible: false, reason: "auto_ramp_disabled" };
  if (opts.stage >= ACQUISITION_MAX_STAGE) return { eligible: false, reason: "max_stage" };
  if (opts.businessDaysInStage < ACQUISITION_MIN_BUSINESS_DAYS_PER_STAGE) {
    return { eligible: false, reason: "need_business_days" };
  }
  if (opts.sent < MIN_SAMPLE_FOR_RAMP) return { eligible: false, reason: "sample_too_small" };
  if (opts.complaintRate >= RAMP_COMPLAINT_MAX) return { eligible: false, reason: "complaint" };
  if (opts.bounceRate >= RAMP_BOUNCE_MAX || opts.unsubRate >= RAMP_UNSUB_MAX) {
    return { eligible: false, reason: "health_gate" };
  }
  return { eligible: true, reason: "ok" };
}

export function shouldHardPause(opts: {
  sent: number;
  bounceRate: number;
  complaintRate: number;
  unsubRate: number;
}): { pause: boolean; reason?: string } {
  if (opts.sent < MIN_SAMPLE_FOR_HARD) return { pause: false };
  if (opts.complaintRate >= HARD_COMPLAINT) return { pause: true, reason: "complaint" };
  if (opts.bounceRate >= HARD_BOUNCE) return { pause: true, reason: "bounce" };
  if (opts.unsubRate >= HARD_UNSUB) return { pause: true, reason: "unsub" };
  return { pause: false };
}

export function shouldReduceStage(opts: {
  sent: number;
  bounceRate: number;
  unsubRate: number;
}): boolean {
  if (opts.sent < MIN_SAMPLE_FOR_HARD) return false;
  return opts.bounceRate > SOFT_BOUNCE || opts.unsubRate > SOFT_UNSUB;
}
