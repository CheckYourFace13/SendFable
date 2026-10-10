import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/session";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { startAutopilotTrial } from "@/lib/autopilot/commercial-account";

const schema = z.object({ confirm: z.literal(true) });

/** Explicit 3-month Autopilot trial. Never starts from a page view. No card. */
export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners and admins can start the trial" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }
  const ent = await getWorkspaceEntitlement(ctx.workspace.id);
  const result = await startAutopilotTrial(ctx.workspace.id, ent.plan, ent.isInternal && !ent.disabled);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
