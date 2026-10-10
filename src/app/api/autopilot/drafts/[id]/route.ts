import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAutopilotDecision,
  cancelAutopilotSchedule,
  scheduleAutopilotDraft,
} from "@/lib/autopilot/approval";
import { getApiContext } from "@/lib/session";

const schema = z.object({
  action: z.enum(["approve", "skip", "edit", "schedule", "cancel-schedule"]),
  confirm: z.literal(true),
  date: z.string().max(20).optional(),
  time: z.string().max(10).optional(),
  timezone: z.string().max(80).optional(),
});

/** In-app decision for a waiting Autopilot draft. Confirm is required. GET never sends. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  if (parsed.data.action === "schedule") {
    const scheduled = await scheduleAutopilotDraft({
      draftId: params.id,
      workspaceId: ctx.workspace.id,
      confirm: true,
      date: parsed.data.date,
      time: parsed.data.time,
      timezone: parsed.data.timezone,
    });
    if (!scheduled.ok) return NextResponse.json({ error: scheduled.error }, { status: 400 });
    return NextResponse.json(scheduled);
  }

  if (parsed.data.action === "cancel-schedule") {
    const canceled = await cancelAutopilotSchedule({
      draftId: params.id,
      workspaceId: ctx.workspace.id,
      confirm: true,
    });
    if (!canceled.ok) return NextResponse.json({ error: canceled.error }, { status: 400 });
    return NextResponse.json({ ok: true, result: "canceled" });
  }

  if (parsed.data.action === "approve") {
    return NextResponse.json({ error: "schedule_required" }, { status: 400 });
  }

  const result = await applyAutopilotDecision({
    draftId: params.id,
    workspaceId: ctx.workspace.id,
    action: parsed.data.action === "skip" ? "reject" : parsed.data.action,
    confirm: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    result: parsed.data.action === "skip" ? "skipped" : result.result,
    campaignId: result.campaignId,
  });
}
