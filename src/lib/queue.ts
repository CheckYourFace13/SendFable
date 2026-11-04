import { Queue, type ConnectionOptions } from "bullmq";

export const CAMPAIGN_QUEUE = "campaign-send";

export interface CampaignSendJob {
  campaignId: string;
  recipientId: string;
  workspaceId: string;
}

let queue: Queue<CampaignSendJob> | null = null;

function redisConnection(): ConnectionOptions | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // BullMQ accepts a connection URL via ioredis-style options
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export function getCampaignQueue(): Queue<CampaignSendJob> | null {
  if (queue) return queue;
  const connection = redisConnection();
  if (!connection) {
    console.warn("[queue] REDIS_URL unset — campaign jobs will process inline");
    return null;
  }
  queue = new Queue<CampaignSendJob>(CAMPAIGN_QUEUE, { connection });
  return queue;
}

export function getRedisConnectionOptions(): ConnectionOptions | null {
  return redisConnection();
}

/** Enqueue recipient jobs. Falls back to returning false so caller can process inline. */
export async function enqueueRecipients(
  jobs: CampaignSendJob[]
): Promise<"queued" | "inline"> {
  const q = getCampaignQueue();
  if (!q) return "inline";

  for (const data of jobs) {
    try {
      await q.add("send", data, {
        // Durable idempotency: duplicate launch/enqueue cannot create a second job
        // for the same recipient row.
        jobId: `campaign-send:${data.recipientId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // BullMQ rejects duplicate jobIds — treat as already enqueued.
      if (/already exists|Job.?Id|duplicate/i.test(msg)) {
        continue;
      }
      throw err;
    }
  }
  return "queued";
}

/** Pause/resume helpers keyed by campaign — worker checks campaign status before send. */
export async function drainCampaignJobs(campaignId: string): Promise<void> {
  const q = getCampaignQueue();
  if (!q) return;
  const delayed = await q.getDelayed();
  const waiting = await q.getWaiting();
  for (const job of [...delayed, ...waiting]) {
    if (job.data.campaignId === campaignId) {
      await job.remove();
    }
  }
}
