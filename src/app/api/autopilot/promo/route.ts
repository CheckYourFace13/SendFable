import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiContext } from "@/lib/session";
import { promoFromCode } from "@/lib/autopilot/commercial";
import { redeemAutopilotPromo } from "@/lib/autopilot/commercial-account";

const schema = z.object({ code: z.string().trim().min(4).max(40) });

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners and admins can redeem a code" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a promo code" }, { status: 400 });
  }
  const promo = promoFromCode(parsed.data.code);
  if (!promo) return NextResponse.json({ error: "That code is not valid" }, { status: 400 });
  const result = await redeemAutopilotPromo(ctx.workspace.id, promo);
  return NextResponse.json(result);
}
