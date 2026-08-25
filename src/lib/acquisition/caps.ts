import { prisma } from "@/lib/prisma";
import {
  acquisitionDailyNewLimit,
  acquisitionDailyTotalLimit,
} from "@/lib/acquisition/flags";
import {
  BOUNCE_PAUSE_THRESHOLD,
  COMPLAINT_PAUSE_THRESHOLD,
} from "@/lib/plans";

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
  const total = rows.length;
  const initial = rows.filter((r) => r.step === "INITIAL").length;
  return { total, initial };
}

export async function canSendNewToday(): Promise<boolean> {
  const { total, initial } = await countSentToday();
  return initial < acquisitionDailyNewLimit() && total < acquisitionDailyTotalLimit();
}

export async function canSendAnyToday(): Promise<boolean> {
  const { total } = await countSentToday();
  return total < acquisitionDailyTotalLimit();
}

export async function ensurePipelineControl() {
  return prisma.acquisitionPipelineControl.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function isPipelinePaused(): Promise<{ paused: boolean; reason?: string | null }> {
  const c = await ensurePipelineControl();
  return { paused: c.paused, reason: c.pauseReason };
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
    data: { paused: false, pauseReason: null },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "pipeline_resumed", meta: {} },
  });
}

/** Recent live outreach window for safety rates (last 200 non-dry-run sends). */
export async function checkOutreachSafetyAndMaybePause(): Promise<{
  ok: boolean;
  bounceRate: number;
  complaintRate: number;
  paused: boolean;
}> {
  const recent = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      sentAt: { not: null },
    },
    orderBy: { sentAt: "desc" },
    take: 200,
    select: { status: true },
  });
  if (recent.length < 20) {
    return { ok: true, bounceRate: 0, complaintRate: 0, paused: false };
  }
  const bounced = recent.filter((r) => r.status === "BOUNCED").length;
  const complained = recent.filter((r) => r.status === "COMPLAINED").length;
  const bounceRate = bounced / recent.length;
  const complaintRate = complained / recent.length;
  let paused = false;
  if (complaintRate >= COMPLAINT_PAUSE_THRESHOLD || bounceRate >= BOUNCE_PAUSE_THRESHOLD) {
    await pausePipeline(
      complaintRate >= COMPLAINT_PAUSE_THRESHOLD
        ? `complaint_rate_${(complaintRate * 100).toFixed(2)}%`
        : `bounce_rate_${(bounceRate * 100).toFixed(2)}%`
    );
    paused = true;
  }
  return {
    ok: !paused,
    bounceRate,
    complaintRate,
    paused,
  };
}
