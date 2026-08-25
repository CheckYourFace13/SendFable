import { prisma } from "@/lib/prisma";
import { acquisitionDailyNewLimit, acquisitionDailyTotalLimit } from "@/lib/acquisition/flags";
import { getEffectiveRampStage } from "@/lib/acquisition/ramp";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function countSentToday(): Promise<{ total: number; initial: number }> {
  const since = startOfUtcDay();
  const rows = await prisma.acquisitionMessage.findMany({
    where: {
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      dryRun: false,
      sentAt: { gte: since },
    },
    select: { step: true },
  });
  return {
    total: rows.length,
    initial: rows.filter((r) => r.step === "INITIAL").length,
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
