/**
 * BullMQ campaign send worker.
 * Run: npm run worker  (or worker:dev)
 * Also works as a Vercel-compatible separate entrypoint via the same script.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import {
  CAMPAIGN_QUEUE,
  getRedisConnectionOptions,
  type CampaignSendJob,
} from "@/lib/queue";
import { sendOneRecipient } from "@/lib/campaign-send";
import { CampaignSendDisabledError } from "@/lib/campaign-send-gate";
import { prisma } from "@/lib/prisma";

const connection = getRedisConnectionOptions();

if (!connection) {
  console.error("[worker] REDIS_URL is required to run the campaign worker");
  process.exit(1);
}

const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);
/** Global SES send ceiling for launch (default 5/s). See PLATFORM_SEND_RATE_PER_SEC. */
const platformSendPerSec = (() => {
  const n = Number(process.env.PLATFORM_SEND_RATE_PER_SEC || 5);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(Math.floor(n), 14);
})();

const worker = new Worker<CampaignSendJob>(
  CAMPAIGN_QUEUE,
  async (job) => {
    try {
      await sendOneRecipient(job.data.recipientId);
    } catch (err) {
      // Delivery gate: complete job without retry/send so queued work cannot leak email.
      if (err instanceof CampaignSendDisabledError) {
        console.warn(
          `[worker] campaign send disabled — not sending recipient ${job.data.recipientId}`
        );
        return;
      }
      throw err;
    }
  },
  {
    connection,
    concurrency,
    // BullMQ group limiter — complements acquirePlatformSendSlot in campaign-send.
    limiter: {
      max: platformSendPerSec,
      duration: 1000,
    },
  }
);

worker.on("ready", () => {
  console.log(
    `[worker] listening on queue "${CAMPAIGN_QUEUE}" (concurrency=${concurrency}, platformSendRate=${platformSendPerSec}/s)`
  );
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

worker.on("completed", (job) => {
  if (process.env.WORKER_VERBOSE) {
    console.log(`[worker] sent recipient ${job.data.recipientId}`);
  }
});

async function shutdown() {
  console.log("[worker] shutting down…");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Also process due scheduled campaigns every 30s
setInterval(async () => {
  try {
    const due = await prisma.campaign.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
      take: 10,
    });
    for (const c of due) {
      const { launchCampaign } = await import("@/lib/campaign-send");
      const { CampaignSendDisabledError } = await import("@/lib/campaign-send-gate");
      console.log(`[worker] launching scheduled campaign ${c.id}`);
      try {
        await launchCampaign(c.id);
      } catch (err) {
        if (err instanceof CampaignSendDisabledError) {
          console.warn(
            `[worker] scheduled campaign ${c.id} not launched — ${err.message}`
          );
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    console.error("[worker] schedule poll error", err);
  }
}, 30_000);

// Acquisition pipeline tick (flag-gated; no-ops when SENDFABLE_ACQUISITION_ENABLED=false)
setInterval(async () => {
  try {
    const { runAcquisitionTick } = await import("@/lib/acquisition/tick");
    const result = await runAcquisitionTick();
    if (!result.ran) return;
    // Always log meaningful actions; skip silent lock_busy / empty no-ops noise
    const interesting = result.actions.some(
      (a) =>
        a.startsWith("discover:") ||
        a.startsWith("autofill:") ||
        a.startsWith("sent:") ||
        a.startsWith("send:") ||
        a.startsWith("auto_approve:") ||
        a.startsWith("ramp:") ||
        a.startsWith("sender_blocked") ||
        a.startsWith("hard_pause") ||
        a.startsWith("replies:") ||
        a.startsWith("paused:") ||
        a.startsWith("inventory:") ||
        a.startsWith("delivery_pending:") ||
        a.startsWith("conversion:")
    );
    if (interesting || process.env.WORKER_VERBOSE) {
      console.log("[worker] acquisition tick", result.actions.join(","));
    }
  } catch (err) {
    console.error("[worker] acquisition tick error", err);
  }
}, 60_000);
