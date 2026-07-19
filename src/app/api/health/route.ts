import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "down"> = { app: "ok" };

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

  const healthy = checks.database === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
