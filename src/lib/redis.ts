import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis | null };

/**
 * Shared Redis connection (rate limiting, quota counters). BullMQ creates its
 * own connections from the same URL. Returns null when REDIS_URL is unset so
 * callers can degrade gracefully in dev.
 */
export function getRedis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.redis = null;
    return null;
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  client.on("error", (err) => {
    if (process.env.NODE_ENV === "development") {
      console.warn("[redis]", err.message);
    }
  });
  globalForRedis.redis = client;
  return client;
}
