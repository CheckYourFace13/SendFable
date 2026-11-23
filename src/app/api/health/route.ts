import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { isText20CheckoutConfigured, isText20Public } from "@/lib/text20";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "down"> = { app: "ok" };
  const warnings: string[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }

  try {
    const redis = getRedis();
    if (redis) {
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "down";
    } else {
      checks.redis = "down";
    }
  } catch {
    checks.redis = "down";
  }

  // Public TEXT20 without Stripe promo mapping would falsely promise auto-apply.
  // Do not expose the promotion id — only a boolean config mismatch flag.
  if (isText20Public() && !isText20CheckoutConfigured()) {
    warnings.push("TEXT20_PUBLIC_MISSING_STRIPE_PROMO");
  }

  const healthy = checks.database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      ...(warnings.length ? { warnings } : {}),
    },
    { status: healthy ? 200 : 503 }
  );
}
