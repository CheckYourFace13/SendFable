import { getRedis } from "@/lib/redis";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

// In-memory fallback for when Redis is unavailable (dev without docker).
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Token-bucket-ish fixed-window limiter backed by Redis.
 * `name` scopes the limit (e.g. "auth", "import"), `id` identifies the caller
 * (IP or user id).
 */
export async function rateLimit(
  name: string,
  id: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const key = `rl:${name}:${id}`;
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      const ttl = count > limit ? await redis.ttl(key) : 0;
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSec: Math.max(0, ttl),
      };
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  bucket.count++;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowSec: 60 },
  import: { limit: 5, windowSec: 60 },
  formSubmit: { limit: 10, windowSec: 60 },
  tracking: { limit: 120, windowSec: 60 },
  testSend: { limit: 10, windowSec: 3600 },
} as const;
