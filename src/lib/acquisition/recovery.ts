/**
 * Automatic safe recovery while a recoverable bounce-rate hard pause is active.
 * Does not weaken normal bounce/complaint/unsub thresholds.
 * Does not require owner/manual resume.
 */

import { prisma } from "@/lib/prisma";
import { WEBSITE_DEMO_COPY_VERSION } from "@/lib/acquisition/queue-policy";
import {
  isRecoverableBouncePauseReason,
  shouldAutoResumeRecoverablePause,
  type SafetyRates,
} from "@/lib/acquisition/ramp";

// Re-export for admin/report callers that import from recovery.
export { isRecoverableBouncePauseReason };

/** Max NEW INITIAL acquisition sends per UTC day while in RECOVERY. */
export const RECOVERY_NEW_PER_DAY = 2;

export type AcquisitionOperationalState = "HARD_PAUSED" | "RECOVERY" | "HEALTHY";

export type AcquisitionStateSnapshot = {
  state: AcquisitionOperationalState;
  reason: string | null;
  recoveryMode: boolean;
  hardPause: boolean;
  paused: boolean;
  why: string;
};

export function deriveAcquisitionState(opts: {
  paused: boolean;
  hardPause: boolean;
  recoveryMode: boolean;
  pauseReason: string | null | undefined;
}): AcquisitionStateSnapshot {
  if (!opts.paused) {
    return {
      state: "HEALTHY",
      reason: null,
      recoveryMode: false,
      hardPause: false,
      paused: false,
      why: "Pipeline sending normally.",
    };
  }
  if (
    opts.hardPause &&
    opts.recoveryMode &&
    isRecoverableBouncePauseReason(opts.pauseReason)
  ) {
    return {
      state: "RECOVERY",
      reason: opts.pauseReason || null,
      recoveryMode: true,
      hardPause: true,
      paused: true,
      why: `Recoverable bounce-rate pause with restricted recovery cadence (max ${RECOVERY_NEW_PER_DAY} new INITIAL/day, Mon–Fri).`,
    };
  }
  return {
    state: "HARD_PAUSED",
    reason: opts.pauseReason || null,
    recoveryMode: false,
    hardPause: opts.hardPause,
    paused: true,
    why: opts.pauseReason
      ? `Hard-paused: ${opts.pauseReason}.`
      : "Hard-paused.",
  };
}

/** Recovery is only for bounce-rate hard pauses — never complaint or unsub. */
export function canEnterRecoveryMode(opts: {
  paused: boolean;
  hardPause: boolean;
  pauseReason: string | null | undefined;
  rates: SafetyRates;
}): boolean {
  if (!opts.paused || !opts.hardPause) return false;
  if (!isRecoverableBouncePauseReason(opts.pauseReason)) return false;
  // Complaints in the rolling window block recovery entirely.
  if (opts.rates.complained > 0 || opts.rates.complaintRate > 0) return false;
  // If rates already clear the hard-pause bar, prefer full auto-resume over recovery.
  if (
    shouldAutoResumeRecoverablePause({
      pauseReason: opts.pauseReason,
      rates: opts.rates,
    })
  ) {
    return false;
  }
  return true;
}

export function isRecoveryEligibleMessage(msg: {
  step: string;
  copyVersion?: string | null;
  dryRun?: boolean;
}): boolean {
  if (msg.dryRun) return false;
  if (msg.step !== "INITIAL") return false;
  if (msg.copyVersion === WEBSITE_DEMO_COPY_VERSION) return false;
  return true;
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function countRecoverySendsToday(now = new Date()): Promise<number> {
  const since = startOfUtcDay(now);
  return prisma.acquisitionEvent.count({
    where: { type: "recovery_send", createdAt: { gte: since } },
  });
}

export async function recoverySlotsLeftToday(now = new Date()): Promise<number> {
  const used = await countRecoverySendsToday(now);
  return Math.max(0, RECOVERY_NEW_PER_DAY - used);
}

export async function getAcquisitionOperationalState(): Promise<AcquisitionStateSnapshot> {
  const control = await prisma.acquisitionPipelineControl.upsert({
    where: { id: "default" },
    create: { id: "default", rampStage: 1, stageEnteredAt: new Date() },
    update: {},
  });
  return deriveAcquisitionState({
    paused: control.paused,
    hardPause: control.hardPause,
    recoveryMode: control.recoveryMode,
    pauseReason: control.pauseReason,
  });
}

export async function enterRecoveryMode(reason: string): Promise<void> {
  const control = await prisma.acquisitionPipelineControl.findUnique({
    where: { id: "default" },
  });
  if (control?.recoveryMode) return;
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: {
      recoveryMode: true,
      recoveryEnteredAt: new Date(),
      // Stay hard-paused for normal cadence; recovery path is explicit.
      paused: true,
      hardPause: true,
      pauseReason: reason,
    },
  });
  await prisma.acquisitionEvent.create({
    data: {
      type: "recovery_entered",
      meta: { reason, newPerDay: RECOVERY_NEW_PER_DAY },
    },
  });
}

export async function exitRecoveryToHealthy(meta: {
  priorReason?: string | null;
  sent?: number;
  bounced?: number;
  bounceRate?: number;
}): Promise<void> {
  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: {
      paused: false,
      pauseReason: null,
      hardPause: false,
      recoveryMode: false,
      recoveryEnteredAt: null,
    },
  });
  await prisma.acquisitionEvent.create({
    data: { type: "recovery_graduated", meta },
  });
}

/** Any hard bounce on a recovery send → leave RECOVERY, stay HARD_PAUSED. */
export async function abortRecoveryAfterHardBounce(opts: {
  messageId: string;
  prospectId: string;
}): Promise<boolean> {
  const tagged = await prisma.acquisitionEvent.findFirst({
    where: {
      type: "recovery_send",
      meta: { path: ["messageId"], equals: opts.messageId },
    },
    select: { id: true },
  });
  if (!tagged) return false;

  await prisma.acquisitionPipelineControl.update({
    where: { id: "default" },
    data: {
      recoveryMode: false,
      recoveryEnteredAt: null,
      paused: true,
      hardPause: true,
      pauseReason: "recovery_hard_bounce",
    },
  });
  await prisma.acquisitionEvent.create({
    data: {
      prospectId: opts.prospectId,
      type: "recovery_aborted",
      meta: { messageId: opts.messageId, reason: "hard_bounce" },
    },
  });
  return true;
}

export async function recordRecoverySend(opts: {
  messageId: string;
  prospectId: string;
}): Promise<void> {
  await prisma.acquisitionEvent.create({
    data: {
      prospectId: opts.prospectId,
      type: "recovery_send",
      meta: { messageId: opts.messageId },
    },
  });
}

export async function wasRecoverySend(messageId: string): Promise<boolean> {
  const tagged = await prisma.acquisitionEvent.findFirst({
    where: {
      type: "recovery_send",
      meta: { path: ["messageId"], equals: messageId },
    },
    select: { id: true },
  });
  return Boolean(tagged);
}

export async function recoveryStatsSince(since: Date): Promise<{
  sends: number;
  deliveries: number;
  bounces: number;
}> {
  const sends = await prisma.acquisitionEvent.count({
    where: { type: "recovery_send", createdAt: { gte: since } },
  });
  const sendEvents = await prisma.acquisitionEvent.findMany({
    where: { type: "recovery_send", createdAt: { gte: since } },
    select: { meta: true },
    take: 500,
  });
  const messageIds = sendEvents
    .map((e) => (e.meta as { messageId?: string })?.messageId)
    .filter((id): id is string => Boolean(id));
  if (messageIds.length === 0) {
    return { sends, deliveries: 0, bounces: 0 };
  }
  const msgs = await prisma.acquisitionMessage.findMany({
    where: { id: { in: messageIds } },
    select: { status: true },
  });
  return {
    sends,
    deliveries: msgs.filter((m) => m.status === "DELIVERED" || m.status === "SENT").length,
    bounces: msgs.filter((m) => m.status === "BOUNCED").length,
  };
}
