import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const DEFAULT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Autopilot Cert Specials</title>
<meta name="robots" content="noindex,nofollow"></head>
<body>
<main>
  <h1>Weekly Specials</h1>
  <p>Welcome to our cafe. Hours 9am–5pm.</p>
  <p>Tuesday taco night is back.</p>
</main>
</body></html>`;

const REDIS_KEY = "autopilot:cert:specials";

/**
 * Controlled public marketing page for Marketing Autopilot live certification.
 * Content is updated via Redis by the cert script — noindex, no customer PII.
 */
export async function GET() {
  const redis = getRedis();
  let html = DEFAULT;
  if (redis) {
    try {
      const stored = await redis.get(REDIS_KEY);
      if (stored && stored.length > 40) html = stored;
    } catch {
      /* use default */
    }
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
