/**
 * Global platform SES send rate limit.
 *
 * AWS account max is 14 msg/s after production approval. Launch posture is
 * deliberately lower so new workspaces and ramp rules stay the bottleneck,
 * not the SES account rate.
 *
 * Default: 5 messages per second (PLATFORM_SEND_RATE_PER_SEC).
 */

import { getRedis } from "@/lib/redis";

const DEFAULT_PER_SEC = 5;

export function platformSendRatePerSec(): number {
  const raw = process.env.PLATFORM_SEND_RATE_PER_SEC?.trim();
  if (!raw) return DEFAULT_PER_SEC;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PER_SEC;
  // Never exceed AWS account max even if misconfigured higher.
  return Math.min(Math.floor(n), 14);
}

/** In-memory fallback when Redis is unavailable. */
let memWindowStart = 0;
let memCount = 0;

/**
 * Acquire one send slot under the global platform rate.
 * Waits (with short sleeps) when the current 1-second window is full.
 * Call immediately before SES SendEmail for campaign recipient sends.
 */
export async function acquirePlatformSendSlot(maxWaitMs = 15_000): Promise<void> {
  const limit = platformSendRatePerSec();
  const deadline = Date.now() + maxWaitMs;
  const redis = getRedis();

  while (Date.now() < deadline) {
    if (redis) {
      try {
        const bucket = `ses:platform:send:${Math.floor(Date.now() / 1000)}`;
        const count = await redis.incr(bucket);
        if (count === 1) await redis.expire(bucket, 2);
        if (count <= limit) return;
        // Window full — sleep until next second (+ small jitter)
        const msIntoSec = Date.now() % 1000;
        await sleep(Math.max(50, 1000 - msIntoSec + Math.floor(Math.random() * 40)));
        continue;
      } catch {
        // fall through to memory
      }
    }

    const now = Date.now();
    const windowStart = now - (now % 1000);
    if (memWindowStart !== windowStart) {
      memWindowStart = windowStart;
      memCount = 0;
    }
    if (memCount < limit) {
      memCount++;
      return;
    }
    await sleep(Math.max(50, 1000 - (now % 1000)));
  }

  throw new Error(
    `Platform send rate limit (${limit}/s) — could not acquire slot within ${maxWaitMs}ms`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
