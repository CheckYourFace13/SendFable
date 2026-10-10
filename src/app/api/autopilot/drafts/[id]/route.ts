import { NextResponse } from "next/server";
import { z } from "zod";
import { applyAutopilotDecision } from "@/lib/autopilot/approval";
import { getApiContext } from "@/lib/session";

const schema = z.object({
  action: z.enum(["approve", "skip", "edit"]),
  confirm: z.literal(true),
});

/** In-app decision for a waiting Autopilot draft. Confirm is required. GET never sends. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
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
