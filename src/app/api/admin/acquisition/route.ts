import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getAcquisitionDashboard } from "@/lib/acquisition/report";
import { runDiscovery } from "@/lib/acquisition/discovery/discover";
import { pausePipeline, resumePipeline } from "@/lib/acquisition/caps";
import { acquisitionDiscoveryEnabled, acquisitionEnabled } from "@/lib/acquisition/flags";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getAcquisitionDashboard();
  return NextResponse.json(data);
}

const postSchema = z.object({
  action: z.enum(["discover", "queue_drafts", "pause", "resume", "reduce_stage"]),
  reason: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "pause") {
    await pausePipeline(parsed.data.reason || "owner_pause");
    return NextResponse.json({ ok: true, paused: true });
  }
  if (parsed.data.action === "resume") {
    await resumePipeline();
    return NextResponse.json({ ok: true, paused: false });
  }
  if (parsed.data.action === "reduce_stage") {
    const { reduceStage } = await import("@/lib/acquisition/ramp");
    const stage = await reduceStage(parsed.data.reason || "owner_reduce");
    return NextResponse.json({ ok: true, stage });
  }
  if (parsed.data.action === "discover") {
    if (!acquisitionEnabled() || !acquisitionDiscoveryEnabled()) {
      return NextResponse.json(
        {
          error:
            "Discovery disabled. Set SENDFABLE_ACQUISITION_ENABLED and SENDFABLE_ACQUISITION_DISCOVERY_ENABLED.",
        },
        { status: 400 }
      );
    }
    const summary = await runDiscovery({ limit: parsed.data.limit ?? 20, enrich: true });
    return NextResponse.json({ ok: true, summary });
  }
  if (parsed.data.action === "queue_drafts") {
    const { autoApproveAndQueue } = await import("@/lib/acquisition/auto-approve");
    const n = await autoApproveAndQueue({ limit: parsed.data.limit ?? 20 });
    return NextResponse.json({ ok: true, ...n });
  }

  return NextResponse.json({ error: "Unknown" }, { status: 400 });
}
