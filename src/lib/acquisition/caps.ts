import { prisma } from "@/lib/prisma";
import { acquisitionDailyNewLimit, acquisitionDailyTotalLimit } from "@/lib/acquisition/flags";
import { getEffectiveRampStage } from "@/lib/acquisition/ramp";
import {
  WEBSITE_DEMO_COPY_VERSION,
  websiteDemoSlotsLeft,
} from "@/lib/acquisition/queue-policy";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function countSentToday(): Promise<{
  total: number;
  initial: number;
  demoInitial: number;
}> {
  const since = startOfUtcDay();
  const rows = await prisma.acquisitionMessage.findMany({
    where: {
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      dryRun: false,
      sentAt: { gte: since },
    },
    select: { step: true, copyVersion: true },
  });
  const casey = rows.filter((r) => r.copyVersion !== WEBSITE_DEMO_COPY_VERSION);
  return {
    total: casey.length,
    initial: casey.filter((r) => r.step === "INITIAL").length,
    demoInitial: rows.filter(
      (r) => r.step === "INITIAL" && r.copyVersion === WEBSITE_DEMO_COPY_VERSION
    ).length,
  };
}

export async function canSendNewToday(): Promise<boolean> {
  const stage = await getEffectiveRampStage();
  const { total, initial } = await countSentToday();
  return (
    initial < acquisitionDailyNewLimit(stage) && total < acquisitionDailyTotalLimit(stage)
  );
}

export async function canSendAnyToday(): Promise<boolean> {
  const stage = await getEffectiveRampStage();
  const { total } = await countSentToday();
  return total < acquisitionDailyTotalLimit(stage);
}

/** Personalized demos do not consume the Casey 5/10 cap. */
export async function canSendWebsiteDemoToday(): Promise<boolean> {
  const { demoInitial } = await countSentToday();
  return websiteDemoSlotsLeft(demoInitial, 0) > 0;
}

/** Unsent demo drafts count against today's 2 so the queue cannot grow past the cap. */
export async function websiteDemoDraftRoom(): Promise<number> {
  const { demoInitial } = await countSentToday();
  const queued = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      step: "INITIAL",
      copyVersion: WEBSITE_DEMO_COPY_VERSION,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
  });
  return websiteDemoSlotsLeft(demoInitial, queued);
}

export async function ensurePipelineControl() {
  return prisma.acquisitionPipelineControl.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      rampStage: 1,
      stageEnteredAt: new Date(),
    },
    update: {},
  });
}

export async function isPipelinePaused(): Promise<{
  paused: boolean;
  reason?: string | null;
  hardPause?: boolean;
}> {
  const c = await ensurePipelineControl();
  return {
    paused: c.paused,
    reason: c.pauseReason,
    hardPause: c.hardPause,
  };
}

export async function pausePipeline(reason: string): Promise<void> {
  await ensurePipelineControl();
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { paused: true, pauseReason: reason },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "pipeline_paused", meta: { reason } },
  });
}

export async function resumePipeline(): Promise<void> {
  await ensurePipelineControl();
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: { paused: false, pauseReason: null, hardPause: false },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "pipeline_resumed", meta: {} },
  });
}

/** @deprecated use evaluateSafetyPauseAndBackoff from ramp.ts */
export async function checkOutreachSafetyAndMaybePause(): Promise<{
  ok: boolean;
  bounceRate: number;
  complaintRate: number;
  paused: boolean;
}> {
  const { evaluateSafetyPauseAndBackoff } = await import("@/lib/acquisition/ramp");
  const r = await evaluateSafetyPauseAndBackoff();
  return {
    ok: r.ok,
    bounceRate: r.rates.bounceRate,
    complaintRate: r.rates.complaintRate,
    paused: !r.ok,
  };
}
