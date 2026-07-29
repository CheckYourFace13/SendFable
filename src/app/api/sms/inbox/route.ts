import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";

const patchSchema = z.object({ id: z.string().min(1) });

/** Mark an inbox message read. Server-side flag gated. */
export async function PATCH(req: Request) {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await prisma.smsMessage.updateMany({
    where: { id: parsed.data.id, workspaceId: ctx.workspace.id, direction: "INBOUND" },
    data: { readAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
