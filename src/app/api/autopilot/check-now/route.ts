import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runAutopilotTick } from "@/lib/autopilot/tick";

/** Owner-triggered check (still never auto-sends). Resets lastFetchedAt so due. */
export async function POST() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.marketingAutopilotConfig.findUnique({
    where: { workspaceId: ctx.workspace.id },
  });
  if (!config?.enabled) {
    return NextResponse.json({ error: "Marketing Autopilot is not enabled" }, { status: 400 });
  }

  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastFetchedAt: null, pausedAt: null },
  });

  const result = await runAutopilotTick();
  return NextResponse.json({ ok: true, actions: result.actions });
}
