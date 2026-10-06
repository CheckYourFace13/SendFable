import { NextResponse } from "next/server";
import { z } from "zod";
import { executeAutopilotAction } from "@/lib/autopilot/approval";
import { appUrl } from "@/lib/utils";

const schema = z.object({
  token: z.string().min(10).max(4000),
  confirm: z.literal(true),
});

/**
 * POST-only owner decision. GET never sends.
 * Body: { token, confirm: true }
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  const result = await executeAutopilotAction({
    token: parsed.data.token,
    confirm: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.result === "edit" && result.campaignId) {
    return NextResponse.json({
      ok: true,
      result: "edit",
      redirectTo: appUrl(`/campaigns/${result.campaignId}`),
    });
  }

  return NextResponse.json({ ok: true, result: result.result, campaignId: result.campaignId });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use the confirmation page. GET never sends a campaign." },
    { status: 405 }
  );
}
