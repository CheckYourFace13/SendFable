import { getRedis } from "@/lib/redis";

const memoryLocks = new Map<string, number>();

/**
 * Best-effort distributed lock (Redis SET NX EX). Falls back to process memory.
 * Returns unlock function; no-op if lock not acquired.
 */
export async function withAcquisitionLock<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>
): Promise<{ acquired: boolean; result?: T }> {
  const lockKey = `acq:lock:${key}`;
  const redis = getRedis();
  let acquired = false;

  if (redis) {
    const ok = await redis.set(lockKey, String(Date.now()), "EX", ttlSec, "NX");
    acquired = ok === "OK";
  } else {
    const now = Date.now();
    const exp = memoryLocks.get(lockKey) || 0;
    if (exp > now) {
      acquired = false;
    } else {
      memoryLocks.set(lockKey, now + ttlSec * 1000);
      acquired = true;
    }
  }

  if (!acquired) return { acquired: false };

  try {
    const result = await fn();
    return { acquired: true, result };
  } finally {
    if (redis) {
      try {
        await redis.del(lockKey);
      } catch {
        /* ignore */
      }
    } else {
      memoryLocks.delete(lockKey);
    }
  }
}
