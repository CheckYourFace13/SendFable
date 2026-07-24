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
  }
);

worker.on("ready", () => {
  console.log(`[worker] listening on queue "${CAMPAIGN_QUEUE}" (concurrency=${concurrency})`);
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
